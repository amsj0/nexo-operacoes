import {database,problem,snapshot,uid} from '@/lib/server';
import {open,seal,hash} from '@/lib/crypto';
import {POST as action} from '@/app/api/actions/route';
export async function POST(req:Request) {
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return problem('Origem inválida.',403);
 const token=req.headers.get('authorization')?.replace(/^Bearer /,''),sessionId=req.headers.get('x-demo-session');
 if(!token||!sessionId)return problem('Credencial ausente ou inválida.',401);
 const db=database(),session:any=await db.prepare('SELECT * FROM connector_sessions WHERE id=? AND expires_at>?').bind(sessionId,Date.now()).first();
 if(!session||session.token_hash!==await hash(token))return problem('Sessão inválida ou expirada.',401);
 let key:CryptoKey,envelope:any,payload:any;
 try {
  key=await crypto.subtle.importKey('jwk',JSON.parse(session.key_jwk),'AES-GCM',false,['encrypt','decrypt']);
  envelope=await req.json();payload=await open(key,sessionId,'request',envelope);
 }catch {return problem('Falha de integridade: conteúdo inválido ou adulterado.',400);}
 const nonce=await db.prepare('INSERT OR IGNORE INTO connector_nonces (id,session_id) VALUES (?,?)').bind(sessionId+':'+envelope.iv,sessionId).run();
 if(!nonce.meta.changes)return problem('Requisição repetida: este envelope já foi utilizado.',409);
 let result:any;
 if(payload.operation==='catalog.read') {
  const data=await snapshot();result={ok:true,operation:'catalog.read',source:'Conector institucional demonstrativo',items:data.items.map((i:any)=>({id:i.id,title:i.title,code:i.code,available:i.available,total:i.total})),count:data.items.length};
 } else if(payload.operation==='reservations.create') {
  const response=await action(new Request(req.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reserve',itemId:payload.itemId,personId:payload.personId})}));
  const data:any=await response.json();result=response.ok?{ok:true,operation:'reservations.create',message:'Pré-reserva registrada no banco de dados.',status:201}:{ok:false,status:response.status,error:data.error};
 } else result={ok:false,status:400,error:'Operação fora do escopo do conector.'};
 const requestId=uid('req_');
 await db.prepare('INSERT INTO audit (id,operation_id,action,detail,created_at) VALUES (?,NULL,?,?,?)').bind(requestId,'Chamada de API criptografada',`${payload.operation} · ${result.ok?'sucesso':'recusada'} · sessão efêmera`,Date.now()).run();
 return Response.json({...await seal(key,sessionId,'response',{...result,requestId,processedAt:new Date().toISOString()}),requestId},{headers:{'Cache-Control':'no-store'}});
}
