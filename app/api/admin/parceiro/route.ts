import {database} from '@/lib/server';
import {requireAdmin,sameOrigin,jsonBody,issueSession,safeClaims,sessionCookie,PartnerError,partnerFailure} from '@/lib/partner-auth';
import {initPartner,adminSnapshot,testPartnerScenario} from '@/lib/partner-server';
const reply=(data:unknown,headers?:HeadersInit)=>Response.json(data,{headers:{'Cache-Control':'no-store',...headers}});
export async function GET(req:Request){try{requireAdmin(req);return reply(await adminSnapshot());}catch(e){return partnerFailure(e);}}
export async function POST(req:Request){try{
 const actor=requireAdmin(req);sameOrigin(req);const body=await jsonBody(req);
 if(body.action==='init'){await initPartner();return reply(await adminSnapshot());}
 if(body.action==='session'){const issued=await issueSession(actor,String(body.subject||''),body.mfa as boolean);return reply({session:safeClaims(issued.claims)},{'Set-Cookie':sessionCookie(req,issued.token)});}
 if(body.action==='revoke'){if(typeof body.sessionId!=='string')throw new PartnerError(400,'Selecione uma sessão.');await database().prepare('UPDATE partner_sessions SET revoked=1 WHERE id=?').bind(body.sessionId).run();return reply(await adminSnapshot());}
 if(body.action==='policy'){if(typeof body.institutionId!=='string'||typeof body.enabled!=='boolean'||typeof body.mfaRequired!=='boolean')throw new PartnerError(400,'Informe uma configuração válida.');const out=await database().prepare('UPDATE partner_tenants SET enabled=?,mfa_required=? WHERE id=?').bind(body.enabled?1:0,body.mfaRequired?1:0,body.institutionId).run();if(!out.meta.changes)throw new PartnerError(404,'Instituição não encontrada.');return reply(await adminSnapshot());}
 if(body.action==='test')return reply(await testPartnerScenario(actor,String(body.scenario||''),new URL(req.url).protocol==='https:'));
 throw new PartnerError(400,'Ação administrativa desconhecida.');
}catch(e){return partnerFailure(e);}}
