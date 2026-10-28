import {env} from 'cloudflare:workers';
import {database,uid} from './server';
export const PARTNER_COOKIE='nexo_partner_session';
export const DEMO_ISSUER='nexo-partner-demo';
export const DEMO_AUDIENCE='nexo-partner-gateway';
export const demoSubjects=[{id:'demo-marina',name:'Marina Oliveira',institutions:['horizonte']},{id:'demo-rafael',name:'Rafael Lima',institutions:['horizonte','aurora']},{id:'demo-luiza',name:'Luiza Costa',institutions:['aurora']}] as const;
export class PartnerError extends Error{constructor(public status:number,message:string){super(message);}}
export type Actor={id:string;email:string};
export function identity(req:Request):Actor|null{const id=req.headers.get('oai-authenticated-user-id'),email=req.headers.get('oai-authenticated-user-email');return id&&email?{id,email:email.toLowerCase()}:null;}
export function isPartnerAdmin(actor:Actor|null){const allowed=env.NEXO_PARTNER_ADMIN_EMAILS?.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)||[];return !!actor&&allowed.includes(actor.email);}
export function requireAdmin(req:Request){const actor=identity(req);if(!actor)throw new PartnerError(401,'Entre com a conta autorizada para acessar o painel.');if(!isPartnerAdmin(actor))throw new PartnerError(403,'Acesso restrito aos administradores do parceiro.');return actor;}
export function sameOrigin(req:Request){if(req.headers.get('origin')!==new URL(req.url).origin)throw new PartnerError(403,'Origem da solicitação inválida.');}
export async function jsonBody(req:Request){const value=await req.text();if(value.length>4096)throw new PartnerError(413,'Solicitação muito extensa.');try{const data=JSON.parse(value);if(!data||typeof data!=='object'||Array.isArray(data))throw new Error();return data as Record<string,unknown>;}catch{throw new PartnerError(400,'Solicitação JSON inválida.');}}
const encoder=new TextEncoder();
function b64url(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
function bytes(value:string){if(!/^[\w-]+$/.test(value))throw new Error();return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}
export async function signingKey(){const db=database();let saved:any=await db.prepare("SELECT jwk FROM partner_keys WHERE id='demo-hs256-v1'").first();if(!saved){const key=await crypto.subtle.generateKey({name:'HMAC',hash:'SHA-256'},true,['sign','verify']);await db.prepare("INSERT OR IGNORE INTO partner_keys (id,jwk) VALUES ('demo-hs256-v1',?)").bind(JSON.stringify(await crypto.subtle.exportKey('jwk',key))).run();saved=await db.prepare("SELECT jwk FROM partner_keys WHERE id='demo-hs256-v1'").first();}return crypto.subtle.importKey('jwk',JSON.parse(saved.jwk),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export type DemoClaims={iss:string;aud:string;sub:string;sid:string;actor:string;iat:number;exp:number;authentication:'simulated';mfa_simulated:boolean};
export async function signClaims(claims:DemoClaims){const content=b64url(encoder.encode(JSON.stringify({alg:'HS256',typ:'JWT'})))+'.'+b64url(encoder.encode(JSON.stringify(claims)));return content+'.'+b64url(new Uint8Array(await crypto.subtle.sign('HMAC',await signingKey(),encoder.encode(content))));}
export async function issueSession(actor:Actor,subject:string,mfa:boolean){if(!demoSubjects.some(s=>s.id===subject))throw new PartnerError(400,'Selecione um perfil fictício válido.');if(typeof mfa!=='boolean')throw new PartnerError(400,'Informe o cenário de segundo fator.');const now=Math.floor(Date.now()/1000),id=uid('ps_');const claims:DemoClaims={iss:DEMO_ISSUER,aud:DEMO_AUDIENCE,sub:subject,sid:id,actor:actor.id,iat:now,exp:now+300,authentication:'simulated',mfa_simulated:mfa};await database().prepare('INSERT INTO partner_sessions (id,subject,actor_id,mfa,created_at,expires_at,revoked) VALUES (?,?,?,?,?,?,0)').bind(id,subject,actor.id,mfa?1:0,now*1000,claims.exp*1000).run();return {token:await signClaims(claims),claims};}
export function cookieToken(req:Request){return req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(PARTNER_COOKIE+'='))?.slice(PARTNER_COOKIE.length+1)||'';}
export function sessionCookie(req:Request,token:string){return `${PARTNER_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/api/parceiro; Max-Age=300${new URL(req.url).protocol==='https:'?'; Secure':''}`;}
export async function verifySession(token:string,actor:Actor|null,steps:string[]=[]){
 if(!actor)throw new PartnerError(401,'Identidade de acesso ao piloto ausente.');steps.push('Identidade do visitante confirmada pelo acesso privado');
 if(!token||token.length>4096)throw new PartnerError(401,'Sessão do parceiro ausente ou inválida.');
 let claims:DemoClaims;
 try{const parts=token.split('.');if(parts.length!==3)throw new Error();const header=JSON.parse(new TextDecoder().decode(bytes(parts[0])));if(header.alg!=='HS256'||header.typ!=='JWT')throw new Error();if(!await crypto.subtle.verify('HMAC',await signingKey(),bytes(parts[2]),encoder.encode(parts[0]+'.'+parts[1])))throw new Error();claims=JSON.parse(new TextDecoder().decode(bytes(parts[1])));}catch{throw new PartnerError(401,'Assinatura da sessão inválida.');}
 steps.push('Assinatura HMAC-SHA256 validada');
 const now=Math.floor(Date.now()/1000);
 if(claims.iss!==DEMO_ISSUER||claims.aud!==DEMO_AUDIENCE||claims.authentication!=='simulated'||typeof claims.sub!=='string'||typeof claims.sid!=='string'||typeof claims.actor!=='string'||typeof claims.mfa_simulated!=='boolean'||!Number.isFinite(claims.exp)||!Number.isFinite(claims.iat)||claims.exp<=now||claims.iat>now+30||claims.exp-claims.iat>300)throw new PartnerError(401,'Sessão expirada ou emitida para outro serviço.');
 steps.push('Emissor, destinatário e validade conferidos');
 const saved:any=await database().prepare('SELECT * FROM partner_sessions WHERE id=?').bind(claims.sid).first();
 if(!saved||saved.revoked||saved.expires_at<=Date.now())throw new PartnerError(401,'Sessão revogada, expirada ou desconhecida.');
 if(claims.actor!==actor.id||saved.actor_id!==actor.id||saved.subject!==claims.sub||saved.mfa!==(claims.mfa_simulated?1:0)||saved.expires_at!==claims.exp*1000)throw new PartnerError(401,'Sessão não corresponde ao visitante autenticado.');
 steps.push('Sessão ativa e vinculada ao visitante');return claims;
}
export function safeClaims(claims:DemoClaims){return {sessionId:claims.sid,subject:claims.sub,name:demoSubjects.find(s=>s.id===claims.sub)?.name||claims.sub,issuer:claims.iss,audience:claims.aud,expiresAt:claims.exp*1000,mfaSimulated:claims.mfa_simulated,authentication:'simulated'};}
export function partnerFailure(error:unknown){const known=error instanceof PartnerError;return Response.json({ok:false,error:known?error.message:'Não foi possível concluir a operação do parceiro.'},{status:known?error.status:503,headers:{'Cache-Control':'no-store'}});}
