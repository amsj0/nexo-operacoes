import {database,uid,txt,number,problem,snapshot,seed} from '@/lib/server';
import {DAY} from '@/lib/seed';
export async function POST(req:Request) {
 // This pilot is deployed owner-private; Sites enforces the access boundary.
 const origin=req.headers.get('origin');
 if(origin&&origin!==new URL(req.url).origin) return problem('Origem da solicitação inválida.',403);
 try {
  const body:any=await req.json(),db=database(),now=Date.now();
  if(body.action==='seed') { const exists=await db.prepare('SELECT id FROM items LIMIT 1').first(); if(!exists) await seed(); return Response.json(await snapshot()); }
  const settings:any=await db.prepare("SELECT * FROM settings WHERE id='main'").first()??{loan_days:14,hold_days:2,max_loans:3};
  if(body.action==='reserve') {
   const item=txt(body.itemId,'Item'),person=txt(body.personId,'Usuário'),id='NX-'+uid().slice(0,6).toUpperCase();
   const out=await db.batch([
    db.prepare(`INSERT INTO operations (id,item_id,person_id,status,created_at,due_at,renewals)
     SELECT ?,i.id,p.id,'pending',?,?,0 FROM items i JOIN people p ON p.id=? AND p.active=1
     WHERE i.id=? AND i.total > (SELECT COUNT(*) FROM operations o WHERE o.item_id=i.id AND (o.status='loaned' OR (o.status='pending' AND o.due_at>?)))
     AND (SELECT COUNT(*) FROM operations o WHERE o.person_id=p.id AND (o.status='loaned' OR (o.status='pending' AND o.due_at>?))) < ?
     AND NOT EXISTS (SELECT 1 FROM operations o WHERE o.item_id=i.id AND o.person_id=p.id AND (o.status='loaned' OR (o.status='pending' AND o.due_at>?)))`).bind(id,now,now+settings.hold_days*DAY,person,item,now,now,settings.max_loans,now),
    db.prepare(`INSERT INTO audit (id,operation_id,action,detail,created_at) SELECT ?,o.id,'Pré-reserva criada',p.name || ' reservou ' || i.title,? FROM operations o JOIN items i ON i.id=o.item_id JOIN people p ON p.id=o.person_id WHERE o.id=?`).bind(uid('a'),now,id)
   ]);
   if(!out[0].meta.changes) return problem('Reserva indisponível: verifique o estoque, uma reserva já existente, o cadastro ativo ou o limite de empréstimos.',409);
  } else if(['loan','return','cancel','reject','renew'].includes(body.action)) {
   const id=txt(body.id,'Solicitação'),action=body.action;
   let sql='',binds:any[]=[];
   if(action==='loan') {sql="UPDATE operations SET status='loaned',loaned_at=?,due_at=? WHERE id=? AND status='pending' AND due_at>?"; binds=[now,now+settings.loan_days*DAY,id,now];}
   if(action==='return') {sql="UPDATE operations SET status='returned',returned_at=? WHERE id=? AND status='loaned'";binds=[now,id];}
   if(action==='cancel'||action==='reject') {sql="UPDATE operations SET status=? WHERE id=? AND status='pending' AND due_at>?";binds=[action==='cancel'?'cancelled':'rejected',id,now];}
   if(action==='renew') {sql="UPDATE operations SET due_at=due_at+?,renewals=renewals+1 WHERE id=? AND status='loaned' AND renewals=0 AND due_at>=? AND NOT EXISTS (SELECT 1 FROM operations other WHERE other.item_id=operations.item_id AND other.status='pending' AND other.due_at>?)";binds=[settings.loan_days*DAY,id,now,now];}
   const labels:Record<string,string>={loan:'Retirada confirmada',return:'Devolução registrada',cancel:'Reserva cancelada',reject:'Reserva recusada',renew:'Empréstimo renovado'};
   const batch=await db.batch([
    db.prepare(sql).bind(...binds),
    db.prepare(`INSERT INTO audit (id,operation_id,action,detail,created_at) SELECT ?,o.id,?,p.name || ' · ' || i.title,? FROM operations o JOIN items i ON i.id=o.item_id JOIN people p ON p.id=o.person_id WHERE o.id=? AND changes()>0`).bind(uid('a'),labels[action],now,id)
   ]);
   if(!batch[0].meta.changes) return problem(action==='renew'?'Não foi possível renovar: verifique o prazo, uma renovação anterior ou reservas pendentes.':'A situação desta solicitação mudou. Atualize os dados.',409);
  } else if(body.action==='addItem') {
   const type=txt(body.type,'Serviço'); if(!['book','equipment','kit'].includes(type)) return problem('Serviço inválido.');
   await db.prepare('INSERT INTO items (id,title,subtitle,category,type,code,total,color,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(uid('i'),txt(body.title,'Título'),txt(body.subtitle,'Autor ou descrição'),txt(body.category,'Categoria',60),type,txt(body.code,'Código',40),number(body.total,'Quantidade',1,1000),['sage','terra','blue','ochre'][Math.floor(Math.random()*4)],now).run();
  } else if(body.action==='addPerson') {
   const email=txt(body.email,'E-mail',180).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return problem('Informe um e-mail válido.');
   await db.prepare('INSERT INTO people (id,name,email,department,active,created_at) VALUES (?,?,?,?,1,?)').bind(uid('p'),txt(body.name,'Nome'),email,txt(body.department,'Setor',100),now).run();
  } else if(body.action==='settings') {
   await db.prepare("INSERT INTO settings (id,institution,loan_days,hold_days,max_loans) VALUES ('main',?,?,?,?) ON CONFLICT(id) DO UPDATE SET institution=excluded.institution,loan_days=excluded.loan_days,hold_days=excluded.hold_days,max_loans=excluded.max_loans").bind(txt(body.institution,'Instituição',100),number(body.loanDays,'Prazo de empréstimo',1,90),number(body.holdDays,'Prazo de retirada',1,14),number(body.maxLoans,'Limite por usuário',1,10)).run();
  } else return problem('Ação desconhecida.');
  return Response.json(await snapshot());
 } catch(error) {
  const message=error instanceof Error?error.message:'';
  if(message.includes('UNIQUE'))return problem('Este código ou e-mail já está cadastrado.',409);
  if(message.includes('D1')||message.includes('SQLITE'))return problem('Não foi possível salvar. Tente novamente.',503);
  return problem(message||'Não foi possível concluir a operação.');
 }
}
