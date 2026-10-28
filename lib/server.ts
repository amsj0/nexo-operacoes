import { env } from 'cloudflare:workers';
import { DAY, seedItems, seedPeople } from './seed';
export function database() { if(!env.DB) throw new Error('Banco de dados indisponível.'); return env.DB; }
export function uid(prefix='') { return prefix+crypto.randomUUID().replaceAll('-','').slice(0,12); }
export function problem(message: string, status=400) { return Response.json({error:message},{status}); }
export function txt(value: unknown, label: string, max=160) { if(typeof value!=='string'||!value.trim()||value.trim().length>max) throw new Error(`${label}: preencha entre 1 e ${max} caracteres.`); return value.trim(); }
export function number(value: unknown, label: string, min: number, max: number) { const n=Number(value); if(!Number.isInteger(n)||n<min||n>max) throw new Error(`${label}: informe um número entre ${min} e ${max}.`); return n; }
export async function snapshot() {
 const db=database(), now=Date.now();
 const results=await db.batch([
  db.prepare(`SELECT i.*, i.total - (SELECT COUNT(*) FROM operations o WHERE o.item_id=i.id AND (o.status='loaned' OR (o.status='pending' AND o.due_at>?))) AS available FROM items i ORDER BY i.created_at,i.id`).bind(now),
  db.prepare('SELECT * FROM people ORDER BY name'),
  db.prepare(`SELECT o.*,i.title,i.type,i.color,i.code,p.name,p.email FROM operations o JOIN items i ON i.id=o.item_id JOIN people p ON p.id=o.person_id ORDER BY o.created_at DESC`),
  db.prepare('SELECT * FROM audit ORDER BY created_at DESC LIMIT 60'),
  db.prepare("SELECT * FROM settings WHERE id='main'")
 ]);
 return {items:results[0].results,people:results[1].results,operations:results[2].results.map((o:any)=>({...o,status:o.status==='pending'&&o.due_at<=now?'expired':o.status})),audit:results[3].results,settings:results[4].results[0]??{institution:'Instituto Horizonte',loan_days:14,hold_days:2,max_loans:3},now};
}
export async function seed() {
 const db=database(),now=Date.now();
 const stmts:any[]=[db.prepare("INSERT OR IGNORE INTO settings (id,institution,loan_days,hold_days,max_loans) VALUES ('main','Instituto Horizonte',14,2,3)")];
 seedItems.forEach((i,n)=>stmts.push(db.prepare('INSERT OR IGNORE INTO items (id,title,subtitle,category,type,code,total,color,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(...i,now-20*DAY+n)));
 seedPeople.forEach(p=>stmts.push(db.prepare('INSERT OR IGNORE INTO people (id,name,email,department,active,created_at) VALUES (?,?,?,?,1,?)').bind(...p,now-20*DAY)));
 const ops=[['NX-1048','i1','p1','pending',now-35*60000,now+2*DAY,null,null],['NX-1047','i2','p2','pending',now-72*60000,now+2*DAY,null,null],['NX-1046','i3','p3','pending',now-130*60000,now+2*DAY,null,null],['NX-1045','i4','p4','loaned',now-10*DAY,now+4*DAY,now-10*DAY,null],['NX-1044','i5','p5','loaned',now-15*DAY,now-DAY,now-15*DAY,null],['NX-1043','i6','p6','loaned',now-12*DAY,now+2*DAY,now-12*DAY,null],['NX-1042','i7','p1','loaned',now-8*DAY,now+6*DAY,now-8*DAY,null],['NX-1041','i10','p2','pending',now-3*3600000,now+2*DAY,null,null],['NX-1040','i1','p3','returned',now-16*DAY,now-2*DAY,now-16*DAY,now-4*3600000]];
 ops.forEach(o=>stmts.push(db.prepare('INSERT OR IGNORE INTO operations (id,item_id,person_id,status,created_at,due_at,loaned_at,returned_at,renewals) VALUES (?,?,?,?,?,?,?,?,0)').bind(...o)));
 [['a1','NX-1048','Pré-reserva criada','Marina Oliveira reservou Design de interfaces',now-35*60000],['a2','NX-1047','Pré-reserva criada','Lucas Santos reservou Introdução à inteligência artificial',now-72*60000],['a3','NX-1040','Devolução registrada','O exemplar de Design de interfaces está disponível',now-4*3600000]].forEach(a=>stmts.push(db.prepare('INSERT OR IGNORE INTO audit (id,operation_id,action,detail,created_at) VALUES (?,?,?,?,?)').bind(...a)));
 await db.batch(stmts);
}
