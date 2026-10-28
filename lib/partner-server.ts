import {database,uid} from './server';
import {PartnerError,demoSubjects,issueSession,signClaims,verifySession,type Actor} from './partner-auth';
import {institutionalCatalog,institutionalReserve} from './partner-institution';
export const partnerScenarios=[{id:'valid',name:'Sessão válida',expected:200},{id:'missing',name:'Sem sessão',expected:401},{id:'tampered',name:'Assinatura adulterada',expected:401},{id:'expired',name:'Sessão expirada',expected:401},{id:'revoked',name:'Sessão revogada',expected:401},{id:'mfa',name:'Sem segundo fator simulado',expected:403},{id:'tenant',name:'Instituição sem vínculo',expected:403},{id:'audience',name:'Destinatário incorreto',expected:401}] as const;
export async function initPartner(){
 const db=database(),statements=[db.prepare("INSERT OR IGNORE INTO partner_tenants (id,name,enabled,mfa_required) VALUES ('horizonte','Instituto Horizonte',1,1)"),db.prepare("INSERT OR IGNORE INTO partner_tenants (id,name,enabled,mfa_required) VALUES ('aurora','Centro Educacional Aurora',1,1)")];
 for(const subject of demoSubjects)for(const tenant of subject.institutions)statements.push(db.prepare('INSERT OR IGNORE INTO partner_members (id,subject,tenant_id,name,active) VALUES (?,?,?,?,1)').bind(subject.id+':'+tenant,subject.id,tenant,subject.name));
 for(const [id,tenant,title,author,total] of [['h-book-1','horizonte','Design de interfaces','Jenifer Tidwell',3],['h-book-2','horizonte','Sistemas de controle modernos','Richard C. Dorf',2],['h-book-3','horizonte','Introdução à robótica','John J. Craig',1],['a-book-1','aurora','Algoritmos: teoria e prática','Thomas H. Cormen',2],['a-book-2','aurora','O design do dia a dia','Don Norman',3],['a-book-3','aurora','Inteligência artificial','Stuart Russell',1]])statements.push(db.prepare('INSERT OR IGNORE INTO partner_items (id,tenant_id,title,author,total) VALUES (?,?,?,?,?)').bind(id,tenant,title,author,total));
 await db.batch(statements);
}
export async function adminSnapshot(){const db=database();const values=await db.batch([db.prepare('SELECT * FROM partner_tenants ORDER BY id'),db.prepare('SELECT id,subject,actor_id,mfa,created_at,expires_at,revoked FROM partner_sessions ORDER BY created_at DESC LIMIT 12'),db.prepare('SELECT * FROM partner_events ORDER BY created_at DESC LIMIT 30'),db.prepare('SELECT tenant_id,COUNT(*) AS total FROM partner_requests GROUP BY tenant_id')]);return {tenants:values[0].results,sessions:values[1].results.map(({actor_id,...s}:any)=>s),events:values[2].results.map((e:any)=>({...e,steps:JSON.parse(e.steps)})),counts:values[3].results,subjects:demoSubjects,scenarios:partnerScenarios,mode:'emulated',googleConnected:false};}
export async function recordPartnerEvent(tenant:string|null,session:string|null,operation:string,status:number,reason:string,steps:string[],id=uid('trace_')){await database().prepare('INSERT INTO partner_events (id,tenant_id,session_id,operation,status,reason,steps,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,tenant,session,operation,status,reason,JSON.stringify(steps),Date.now()).run();return id;}
export async function executePartner(token:string,actor:Actor|null,body:Record<string,unknown>,https:boolean){
 const steps:string[]=[],id=uid('trace_');let sessionId:string|null=null;const tenant=typeof body.institutionId==='string'?body.institutionId.slice(0,80):null,operation=typeof body.operation==='string'?body.operation.slice(0,80):'';
 try{
  const claims=await verifySession(token,actor,steps);sessionId=claims.sid;
  if(!tenant)throw new PartnerError(400,'Selecione uma instituição.');
  const policy:any=await database().prepare('SELECT * FROM partner_tenants WHERE id=?').bind(tenant).first();
  if(!policy||!policy.enabled)throw new PartnerError(403,'Serviço institucional indisponível.');steps.push('Biblioteca habilitada na instituição selecionada');
  const member=await database().prepare('SELECT id FROM partner_members WHERE subject=? AND tenant_id=? AND active=1').bind(claims.sub,tenant).first();
  if(!member)throw new PartnerError(403,'O perfil não possui vínculo com esta instituição.');steps.push('Vínculo institucional ativo confirmado');
  if(policy.mfa_required&&!claims.mfa_simulated)throw new PartnerError(403,'Esta instituição exige o segundo fator simulado.');steps.push(policy.mfa_required?'Política de MFA atendida pelo cenário simulado':'Política institucional permite este cenário sem MFA');
  if(!['catalog.read','reservations.create'].includes(operation))throw new PartnerError(403,'Operação fora do escopo autorizado.');steps.push('Operação permitida: '+operation);
  const data=operation==='catalog.read'?await institutionalCatalog(tenant,claims.sub):await institutionalReserve(tenant,claims.sub,body.itemId);steps.push('Adaptador local executado com usuário e instituição verificados');
  const status=operation==='reservations.create'?201:200;
  await recordPartnerEvent(tenant,sessionId,operation,status,'Operação autorizada e executada',steps,id);
  return Response.json({ok:true,requestId:id,institution:{id:policy.id,name:policy.name},data,trace:steps,security:{transport:https?'HTTPS/TLS':'Prévia local HTTP',session:'Assinatura HS256 validada',identity:'simulated',mfa:'simulated',adapter:'local'}},{status,headers:{'Cache-Control':'no-store'}});
 }catch(error){const known=error instanceof PartnerError,status=known?error.status:503,reason=known?error.message:'Falha no processamento do parceiro.';await recordPartnerEvent(tenant,sessionId,operation||'unknown',status,reason,steps,id);return Response.json({ok:false,requestId:id,error:reason,trace:steps},{status,headers:{'Cache-Control':'no-store'}});}
}
export async function testPartnerScenario(actor:Actor,scenario:string,https:boolean){
 const spec=partnerScenarios.find(s=>s.id===scenario);if(!spec)throw new PartnerError(400,'Cenário de teste inválido.');
 const issued=await issueSession(actor,'demo-marina',scenario!=='mfa');let token=issued.token;
 try{
  if(scenario==='missing')token='';
  if(scenario==='tampered'){const parts=token.split('.');parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);token=parts.join('.');}
  if(scenario==='expired')token=await signClaims({...issued.claims,iat:Math.floor(Date.now()/1000)-301,exp:Math.floor(Date.now()/1000)-1});
  if(scenario==='revoked')await database().prepare('UPDATE partner_sessions SET revoked=1 WHERE id=?').bind(issued.claims.sid).run();
  if(scenario==='audience')token=await signClaims({...issued.claims,aud:'another-service'});
  const response=await executePartner(token,actor,{institutionId:scenario==='tenant'?'aurora':'horizonte',operation:'catalog.read'},https),data:any=await response.json();
  const policy:any=await database().prepare("SELECT enabled,mfa_required FROM partner_tenants WHERE id='horizonte'").first();const expected=scenario==='valid'?policy?.enabled?200:403:scenario==='mfa'?policy?.enabled&&!policy?.mfa_required?200:403:spec.expected;return {scenario:spec.id,name:spec.name,expected,status:response.status,passed:response.status===expected,detail:data};
 }finally{await database().prepare('UPDATE partner_sessions SET revoked=1 WHERE id=?').bind(issued.claims.sid).run();}
}
