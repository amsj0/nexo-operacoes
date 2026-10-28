import {database,problem,snapshot,txt} from '@/lib/server';
import {POST as institutionAction} from '@/app/api/actions/route';
// One resource, two operations. Sites restricts this demonstration API to the private pilot.
export async function GET(req:Request){
 try{
  const data:any=await snapshot(),busca=(new URL(req.url).searchParams.get('busca')||'').toLocaleLowerCase('pt-BR');
  return Response.json({instituicao:data.settings.institution,itens:data.items.filter((i:any)=>i.type==='book'&&(i.title+' '+i.subtitle).toLocaleLowerCase('pt-BR').includes(busca)).map((i:any)=>({id:i.id,titulo:i.title,autor:i.subtitle,disponiveis:i.available,total:i.total}))},{headers:{'Cache-Control':'no-store'}});
 }catch{return problem('Não foi possível consultar a biblioteca. Tente novamente.',503);}
}
export async function POST(req:Request){
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return problem('Origem da solicitação inválida.',403);
 try{
  const body:any=await req.json();
  if(!body||typeof body!=='object')return problem('Informe livroId e usuarioId.');
  const livroId=txt(body.livroId,'Livro',80),usuarioId=txt(body.usuarioId,'Usuário',80);
  const book=await database().prepare("SELECT id FROM items WHERE id=? AND type='book'").bind(livroId).first();
  if(!book)return problem('Livro não encontrado na biblioteca.',404);
  const result=await institutionAction(new Request(req.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reserve',itemId:livroId,personId:usuarioId})}));
  if(!result.ok)return result;
  const state:any=await result.json(),op=state.operations.find((o:any)=>o.item_id===livroId&&o.person_id===usuarioId&&o.status==='pending');
  return Response.json({reserva:{protocolo:op.id,livroId,titulo:op.title,usuarioId,situacao:'pre-reservado',retirarAte:new Date(op.due_at).toISOString()}},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch(error){const message=error instanceof Error?error.message:'';return problem(message.includes('D1')||message.includes('SQLITE')?'Não foi possível registrar a pré-reserva. Tente novamente.':message||'Informe livroId e usuarioId.');}
}
