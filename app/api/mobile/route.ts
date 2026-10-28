import {database,problem,txt} from '@/lib/server';
import {mobileSnapshot} from '@/lib/mobile-server';
import {validWallet} from '@/lib/mobile-services';
import {POST as institutionAction} from '@/app/api/actions/route';
const response=(data:unknown)=>Response.json(data,{headers:{'Cache-Control':'no-store'}});
// Owner-private pilot: personId selects a fictional demo profile, not an identity credential.
export async function GET(req:Request){
 try{return response(await mobileSnapshot(new URL(req.url).searchParams.get('person')||'p1'));}
 catch(error){return problem(error instanceof Error&&error.message.includes('Perfil')?error.message:'Não foi possível carregar sua carteira. Tente novamente.',503);}
}
export async function POST(req:Request){
 const origin=req.headers.get('origin');
 if(origin&&origin!==new URL(req.url).origin)return problem('Origem da solicitação inválida.',403);
 try{
  const body:any=await req.json();
  if(!body||typeof body!=='object')return problem('Solicitação inválida.');
  const personId=txt(body.personId,'Perfil',80),db=database();
  const person=await db.prepare('SELECT id FROM people WHERE id=? AND active=1').bind(personId).first();
  if(!person)return problem('Perfil de demonstração indisponível.',404);
  if(body.action==='wallet'){
   if(!validWallet(body.services))return problem('Selecione serviços válidos, sem repetições.');
   await db.prepare('INSERT INTO mobile_wallets (person_id,services,updated_at) VALUES (?,?,?) ON CONFLICT(person_id) DO UPDATE SET services=excluded.services,updated_at=excluded.updated_at').bind(personId,JSON.stringify(body.services),Date.now()).run();
  }else if(['reserve','cancel','renew'].includes(body.action)){
   if(body.action!=='reserve'){
    const operation=await db.prepare('SELECT id FROM operations WHERE id=? AND person_id=?').bind(txt(body.id,'Solicitação',80),personId).first();
    if(!operation)return problem('Solicitação indisponível para este perfil.',403);
   }
   const result=await institutionAction(new Request(req.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:body.action,personId,itemId:body.itemId,id:body.id})}));
   if(!result.ok)return result;
  }else return problem('Operação indisponível no cliente mobile.');
  return response(await mobileSnapshot(personId));
 }catch(error){
  const message=error instanceof Error?error.message:'';
  return problem(message.includes('D1')||message.includes('SQLITE')?'Não foi possível salvar. Tente novamente.':message||'Não foi possível concluir a operação.');
 }
}
