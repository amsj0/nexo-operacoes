'use client';
import {useState} from 'react';
import {ArrowRight,Check,CheckCheck,ChevronDown,Code2,Database,Globe,KeyRound,Link2,LockKeyhole,Play,RefreshCw,ShieldCheck,ShieldX,Terminal,Unplug,AlertCircle} from 'lucide-react';
import {b64,unb64,derive,seal,open} from '@/lib/crypto';
import type {Workspace} from '@/lib/model';
export default function Integrations({data,refresh}:{data:Workspace;refresh:()=>void}) {
 const [operation,setOperation]=useState('catalog.read'),[itemId,setItemId]=useState(''),[personId,setPersonId]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState<any>(null),[error,setError]=useState(''),[tab,setTab]=useState('result'),[test,setTest]=useState<any>(null);
 async function run(mode='normal') {
  setBusy(true);setError('');setTest(null);
  try {
   if(!crypto.subtle)throw new Error('A criptografia do navegador exige HTTPS. Abra a versão publicada para executar a demonstração.');
   if(operation==='reservations.create'&&(!itemId||!personId))throw new Error('Selecione o item e o usuário para a pré-reserva.');
   const start=performance.now(),keys=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
   const handshakeResponse=await fetch('/api/connector/handshake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({publicKey:await crypto.subtle.exportKey('jwk',keys.publicKey)})});
   const handshake:any=await handshakeResponse.json();if(!handshakeResponse.ok)throw new Error(handshake.error);
   const serverKey=await crypto.subtle.importKey('jwk',handshake.publicKey,{name:'ECDH',namedCurve:'P-256'},false,[]),key=await derive(keys.privateKey,serverKey,unb64(handshake.salt));
   const plain=operation==='catalog.read'?{operation}:{operation,itemId,personId};
   const envelope=await seal(key,handshake.sessionId,'request',plain);
   if(mode==='tamper'){const bytes=unb64(envelope.ciphertext);bytes[0]^=1;envelope.ciphertext=b64(bytes);}
   const response=await fetch('/api/connector/exchange',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-Session':handshake.sessionId,...(mode==='unauthorized'?{}:{Authorization:`Bearer ${handshake.token}`})},body:JSON.stringify(envelope)}),wire:any=await response.json();
   if(mode!=='normal') {setTest({mode,status:response.status,message:wire.error,passed:mode==='tamper'?response.status===400:response.status===401});return;}
   if(!response.ok)throw new Error(wire.error);
   const decrypted=await open(key,handshake.sessionId,'response',wire);
   setResult({request:envelope,response:wire,plain,decrypted,latency:Math.round(performance.now()-start),https:location.protocol==='https:',time:new Date().toLocaleTimeString('pt-BR'),session:handshake.sessionId});setTab('result');refresh();
  }catch(e){setError(e instanceof Error?e.message:'Falha na chamada de API.');}finally{setBusy(false);}
 }
 return <>
  <div className="page-heading"><div><div className="eyebrow">CONECTE O QUE JÁ EXISTE</div><h1>Integrações</h1><p>Seu sistema continua. O Nexo cuida das operações.</p></div><span className="tag green"><span className="status-dot"/>Sandbox disponível</span></div>
  <div className="integration-hero"><div className="integration-shield"><ShieldCheck size={32}/></div><div><h2>Uma ponte segura entre sistemas.</h2><p>Teste uma chamada de API com criptografia real, autenticação efêmera e validação de integridade.</p></div><span className="outline-label">API v1</span></div>
  <div className="connection-flow">
   <div><span className="node-icon"><Globe/></span><strong>Cliente Nexo</strong><small>Solicita a operação</small></div><span className="flow-link"><LockKeyhole size={15}/><span>Conteúdo criptografado</span><ArrowRight size={18}/></span>
   <div><span className="node-icon dark"><Link2/></span><strong>API do conector</strong><small>Autentica e valida</small></div><span className="flow-link"><ShieldCheck size={16}/><span>Acesso controlado</span><ArrowRight size={18}/></span><div><span className="node-icon"><Database/></span><strong>Acervo institucional</strong><small>Banco demonstrativo</small></div>
  </div>
  <div className="integration-layout"><section className="panel api-config"><div className="panel-heading"><h2><Terminal size={18}/>Testar uma operação</h2><span className="tag">Sandbox</span></div><div className="panel-body">
   <p className="muted small">O conector simula um sistema existente dentro deste piloto. Nenhum banco externo está conectado.</p>
   <label>Operação<select value={operation} onChange={e=>setOperation(e.target.value)}><option value="catalog.read">Consultar disponibilidade do acervo</option><option value="reservations.create">Criar uma pré-reserva</option></select></label>
   {operation==='reservations.create'&&<><label>Item<select value={itemId} onChange={e=>setItemId(e.target.value)}><option value="">Selecione um item</option>{data.items.map(i=><option key={i.id} value={i.id}>{i.title} ({i.available} disponíveis)</option>)}</select></label><label>Usuário<select value={personId} onChange={e=>setPersonId(e.target.value)}><option value="">Selecione um usuário</option>{data.people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><p className="note">Esta chamada cria uma pré-reserva real nos dados do piloto.</p></>}
   <div className="endpoint"><span>POST</span><code>/api/connector/exchange</code></div>
   <div className="security-facts"><p><LockKeyhole size={15}/><span>Criptografia do conteúdo<strong>AES-256-GCM</strong></span><Check size={15}/></p><p><KeyRound size={15}/><span>Troca de chaves<strong>ECDH P-256 + HKDF</strong></span><Check size={15}/></p><p><ShieldCheck size={15}/><span>Autenticação<strong>Bearer · sessão de 5 minutos</strong></span><Check size={15}/></p><p><Globe size={15}/><span>Transporte<strong>HTTPS na versão publicada</strong></span><Check size={15}/></p></div>
   <button className="btn primary full" disabled={busy} onClick={()=>run()}>{busy?<RefreshCw size={17} className="spin"/>:<Play size={16}/>} {busy?'Executando chamada…':'Executar chamada segura'}</button>
   {error&&<p className="form-error" role="alert"><AlertCircle size={16}/>{error}</p>}
  </div></section>
  <section className="panel api-inspector"><div className="panel-heading"><h2>Inspetor da comunicação</h2>{result?<span className="tag green">200 OK · {result.latency} ms</span>:<span className="muted small">Aguardando chamada</span>}</div>
   <div className="inspector-tabs">{[['result','Resultado'],['request','Requisição cifrada'],['response','Resposta cifrada']].map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div>
   {!result?<div className="inspector-empty"><div className="code-orbit"><Code2 size={35}/><LockKeyhole size={16}/></div><h3>Veja a integração acontecer.</h3><p>Execute uma chamada para inspecionar os dados enviados, o envelope criptografado e a resposta da API.</p><span>O conteúdo é cifrado antes do envio.</span></div>:<div className="inspector-result">{tab==='result'?<><div className="success-line"><CheckCheck size={19}/><div><strong>{result.decrypted.ok?'Comunicação concluída e validada':'Comunicação válida · operação recusada'}</strong><span>Resposta decifrada pelo cliente às {result.time}</span></div></div><div className="mini-facts"><span><LockKeyhole size={14}/>Integridade validada</span><span><KeyRound size={14}/>Sessão autenticada</span><span><Globe size={14}/>{result.https?'Transporte HTTPS':'Preview local HTTP'}</span></div><div className="code-label">DADOS INTERPRETADOS PELO CLIENTE</div><pre>{JSON.stringify(result.decrypted,null,2)}</pre></>:<><div className="code-label">{tab==='request'?'ENVELOPE ENVIADO À API':'ENVELOPE RECEBIDO PELO CLIENTE'}</div><pre>{JSON.stringify(result[tab],null,2)}</pre><p className="small muted">O campo ciphertext contém bytes cifrados, representados em Base64. A chave e o token não são exibidos.</p></>}</div>}
  </section></div>
  <section className="panel test-panel"><div><h2>Coloque a proteção à prova.</h2><p>Envie um conteúdo alterado ou uma chamada sem credencial e confira a recusa da API.</p></div><div className="row"><button className="btn" disabled={busy} onClick={()=>run('tamper')}><ShieldX size={16}/>Testar adulteração</button><button className="btn" disabled={busy} onClick={()=>run('unauthorized')}><Unplug size={16}/>Testar sem credencial</button></div>{test&&<div className={'test-result '+(test.passed?'good':'bad')} role="status"><ShieldCheck size={18}/><strong>HTTP {test.status}</strong><span>{test.message}</span></div>}</section>
  <details className="panel technical-notes"><summary>Como este piloto se conecta a um sistema real <ChevronDown size={17}/></summary><div><p>O adaptador demonstrativo é executado neste aplicativo e consulta os dados do piloto. Para conectar uma biblioteca ou ERP real, o próximo passo é implementar um adaptador no servidor para a API HTTPS da instituição, com credenciais mantidas no servidor, escopos e autorização por instituição.</p><p>A sessão demonstrativa é criada após o acesso privado ao piloto. Ela não substitui o cadastro de clientes, o isolamento entre instituições ou uma autenticação de serviço em produção. A criptografia adicional do conteúdo serve para tornar o fluxo visível; o HTTPS permanece necessário para autenticar o servidor.</p><a href="https://www.w3.org/TR/WebCryptoAPI/" target="_blank" rel="noreferrer">Referência: W3C Web Cryptography API ↗</a></div></details>
 </>;
}
