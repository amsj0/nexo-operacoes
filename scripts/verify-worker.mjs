// Runs integration checks in an isolated production Worker runtime, not a preview server.
import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler'));
const {Miniflare}=wranglerRequire('miniflare');
const root=path.resolve('dist/server');
const files=(await readdir(root,{recursive:true})).filter(n=>n.endsWith('.js'));
const modules=['index.js',...files.filter(n=>n!=='index.js')].map(n=>({type:'ESModule',path:path.join(root,n)}));
const mf=new Miniflare({
 name:'nexo-isolated-qa',modules,modulesRoot:root,
 compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],
 d1Databases:{DB:'nexo-isolated-qa'},cf:false,
 bindings:{NEXO_PARTNER_ADMIN_EMAILS:'admin@nexo.example'}
});
try{
 const db=await mf.getD1Database('DB');
 for(const name of (await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort()){
  const sql=await readFile(path.join('drizzle',name),'utf8');
  for(const statement of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
 }
 globalThis.__nexoTestFetch=(url,init)=>mf.dispatchFetch(url,init);
 await import('./verify-pilot.mjs');
 await import('./verify-mobile.mjs');
 await import('./verify-partner.mjs');
}finally{await mf.dispose();delete globalThis.__nexoTestFetch;}
