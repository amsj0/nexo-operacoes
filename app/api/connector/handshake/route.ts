import {database,problem,uid} from '@/lib/server';
import {b64,derive,hash} from '@/lib/crypto';
export async function POST(req:Request) {
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return problem('Origem inválida.',403);
 try {
  const {publicKey}=await req.json() as {publicKey:JsonWebKey};
  const clientKey=await crypto.subtle.importKey('jwk',publicKey,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const serverKeys=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const salt=crypto.getRandomValues(new Uint8Array(32)),key=await derive(serverKeys.privateKey,clientKey,salt);
  const sessionId=uid('sess_'),token=b64(crypto.getRandomValues(new Uint8Array(32))),expiresAt=Date.now()+5*60000,db=database();
  await db.batch([
   db.prepare('DELETE FROM connector_nonces WHERE session_id IN (SELECT id FROM connector_sessions WHERE expires_at<?)').bind(Date.now()),
   db.prepare('DELETE FROM connector_sessions WHERE expires_at<?').bind(Date.now()),
   db.prepare('INSERT INTO connector_sessions (id,key_jwk,token_hash,expires_at) VALUES (?,?,?,?)').bind(sessionId,JSON.stringify(await crypto.subtle.exportKey('jwk',key)),await hash(token),expiresAt)
  ]);
  return Response.json({sessionId,token,expiresAt,salt:b64(salt),publicKey:await crypto.subtle.exportKey('jwk',serverKeys.publicKey),mode:'sandbox',scope:['catalog:read','reservations:create']},{headers:{'Cache-Control':'no-store'}});
 }catch { return problem('Não foi possível estabelecer a sessão segura.',400); }
}
