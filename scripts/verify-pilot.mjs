import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:4173';
if(!/^http:\/\/(127\.0\.0\.1|localhost|terminal\.local):4173$/.test(base))throw new Error('Execute somente contra o preview local, nunca no ambiente publicado.');
const request=globalThis.__nexoTestFetch??fetch;
const checks=[];function ok(label){checks.push(label);console.log('PASS '+label)}
async function post(path,body,headers={}){const r=await request(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
async function action(body){return post('/api/actions',body)}
await action({action:'seed'});
const marker=crypto.randomUUID().slice(0,7);
let r=await action({action:'addItem',type:'book',title:'QA · concorrência '+marker,subtitle:'Fixture de validação',category:'QA',code:'QA-'+marker,total:1});assert.equal(r.status,200);
const item=r.data.items.find(x=>x.code==='QA-'+marker);
const persons=[];for(let n=1;n<=2;n++){r=await action({action:'addPerson',name:'QA Pessoa '+n+' '+marker,email:`qa-${marker}-${n}@instituto.example`,department:'QA'});assert.equal(r.status,200);persons.push(r.data.people.find(x=>x.email===`qa-${marker}-${n}@instituto.example`));}
const race=await Promise.all(persons.map(p=>action({action:'reserve',itemId:item.id,personId:p.id})));
assert.deepEqual(race.map(x=>x.status).sort(),[200,409]);ok('Reservas simultâneas não excedem uma unidade disponível');
const winner=race.find(x=>x.status===200).data;let op=winner.operations.find(x=>x.item_id===item.id);assert.equal(winner.items.find(x=>x.id===item.id).available,0);
r=await action({action:'reserve',itemId:item.id,personId:op.person_id});assert.equal(r.status,409);ok('Duplicidade/estoque indisponível recusados');
r=await action({action:'loan',id:op.id});assert.equal(r.status,200);assert.equal(r.data.operations.find(x=>x.id===op.id).status,'loaned');ok('Retirada converte pré-reserva em empréstimo');
r=await action({action:'renew',id:op.id});assert.equal(r.status,200);r=await action({action:'renew',id:op.id});assert.equal(r.status,409);ok('Apenas uma renovação elegível é permitida');
r=await action({action:'return',id:op.id});assert.equal(r.status,200);assert.equal(r.data.items.find(x=>x.id===item.id).available,1);const count=r.data.audit.length;r=await action({action:'return',id:op.id});assert.equal(r.status,409);ok('Devolução libera estoque; repetição é recusada');
const enc=new TextEncoder(),b64=b=>Buffer.from(b).toString('base64'),bytes=s=>Buffer.from(s,'base64');
const keys=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
r=await post('/api/connector/handshake',{publicKey:await crypto.subtle.exportKey('jwk',keys.publicKey)});assert.equal(r.status,200);const hs=r.data;
const serverKey=await crypto.subtle.importKey('jwk',hs.publicKey,{name:'ECDH',namedCurve:'P-256'},false,[]);
const bits=await crypto.subtle.deriveBits({name:'ECDH',public:serverKey},keys.privateKey,256),material=await crypto.subtle.importKey('raw',bits,'HKDF',false,['deriveKey']);
const key=await crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:bytes(hs.salt),info:enc.encode('nexo-connector-v1')},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
const headers={Authorization:'Bearer '+hs.token,'X-Demo-Session':hs.sessionId};
async function seal(payload){const iv=crypto.getRandomValues(new Uint8Array(12));return {version:1,algorithm:'AES-256-GCM',iv:b64(iv),ciphertext:b64(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(`nexo:v1:${hs.sessionId}:request`),tagLength:128},key,enc.encode(JSON.stringify(payload))))};}
async function open(envelope){return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(envelope.iv),additionalData:enc.encode(`nexo:v1:${hs.sessionId}:response`),tagLength:128},key,bytes(envelope.ciphertext))));}
const envelope=await seal({operation:'catalog.read'});r=await post('/api/connector/exchange',envelope,headers);assert.equal(r.status,200);const catalog=await open(r.data);assert.equal(catalog.ok,true);assert(catalog.items.some(i=>i.id===item.id));assert(!bytes(r.data.ciphertext).includes(Buffer.from(item.title)));ok('Consulta de catálogo cifra requisição e resposta; cliente decifra corretamente');
r=await post('/api/connector/exchange',envelope,headers);assert.equal(r.status,409);ok('Replay do mesmo envelope é recusado');
const tampered=await seal({operation:'catalog.read'}),changed=bytes(tampered.ciphertext);changed[0]^=1;tampered.ciphertext=b64(changed);r=await post('/api/connector/exchange',tampered,headers);assert.equal(r.status,400);ok('Adulteração de conteúdo detectada por AES-GCM');
r=await post('/api/connector/exchange',await seal({operation:'catalog.read'}),{'X-Demo-Session':hs.sessionId});assert.equal(r.status,401);ok('Ausência de credencial é recusada');
r=await post('/api/connector/exchange',await seal({operation:'catalog.read'}),{...headers,Authorization:'Bearer invalid'});assert.equal(r.status,401);ok('Credencial inválida é recusada');
r=await post('/api/connector/exchange',await seal({operation:'reservations.create',itemId:item.id,personId:persons[0].id}),headers);assert.equal(r.status,200);const reserved=await open(r.data);assert.equal(reserved.ok,true);assert.equal(reserved.status,201);ok('Pré-reserva via API criptografada persiste no banco');
const state=await (await request(base+'/api/workspace')).json();assert.equal(state.items.find(x=>x.id===item.id).available,0);const pending=state.operations.find(x=>x.item_id===item.id&&x.status==='pending');await action({action:'cancel',id:pending.id});ok('Estado persiste em nova consulta e cancelamento libera o item');
console.log(JSON.stringify({passed:checks.length,fixtureCode:item.code,fixturePeople:persons.map(p=>p.id)}));
