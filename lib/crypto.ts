export const enc = new TextEncoder();
export function b64(bytes: ArrayBuffer | Uint8Array) { return btoa(String.fromCharCode(...new Uint8Array(bytes))); }
export function unb64(value:string) { return Uint8Array.from(atob(value),c=>c.charCodeAt(0)); }
export async function hash(value:string) { return b64(await crypto.subtle.digest('SHA-256',enc.encode(value))); }
export async function derive(privateKey:CryptoKey,publicKey:CryptoKey,salt:Uint8Array) {
 const bits=await crypto.subtle.deriveBits({name:'ECDH',public:publicKey},privateKey,256);
 const base=await crypto.subtle.importKey('raw',bits,'HKDF',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:salt as BufferSource,info:enc.encode('nexo-connector-v1')},base,{name:'AES-GCM',length:256},true,['encrypt','decrypt']);
}
export async function seal(key:CryptoKey,sessionId:string,direction:string,payload:unknown) {
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(`nexo:v1:${sessionId}:${direction}`),tagLength:128},key,enc.encode(JSON.stringify(payload)));
 return {version:1,algorithm:'AES-256-GCM',iv:b64(iv),ciphertext:b64(ciphertext)};
}
export async function open(key:CryptoKey,sessionId:string,direction:string,envelope:any) {
 if(envelope?.version!==1||envelope?.algorithm!=='AES-256-GCM'||typeof envelope.iv!=='string'||typeof envelope.ciphertext!=='string'||envelope.ciphertext.length>22000) throw new Error('Envelope inválido.');
 const iv=unb64(envelope.iv); if(iv.length!==12) throw new Error('IV inválido.');
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:enc.encode(`nexo:v1:${sessionId}:${direction}`),tagLength:128},key,unb64(envelope.ciphertext));
 return JSON.parse(new TextDecoder().decode(plain));
}
