import {database,uid} from './server';
import {PartnerError} from './partner-auth';
// Local institutional adapter. No external server or second TLS connection is claimed.
export async function institutionalCatalog(tenant:string,subject:string){
 const db=database(),now=Date.now();
 const items=await db.prepare(`SELECT i.id,i.title,i.author,i.total,i.total-(SELECT COUNT(*) FROM partner_requests r WHERE r.tenant_id=i.tenant_id AND r.item_id=i.id AND r.status='pending' AND r.due_at>?) AS available FROM partner_items i WHERE i.tenant_id=? ORDER BY i.id`).bind(now,tenant).all();
 const requests=await db.prepare('SELECT r.*,i.title FROM partner_requests r JOIN partner_items i ON i.id=r.item_id AND i.tenant_id=r.tenant_id WHERE r.tenant_id=? AND r.subject=? ORDER BY r.created_at DESC LIMIT 20').bind(tenant,subject).all();
 return {items:items.results,reservations:requests.results,adapter:'Sistema institucional emulado no mesmo Worker'};
}
export async function institutionalReserve(tenant:string,subject:string,itemId:unknown){
 if(typeof itemId!=='string'||itemId.length>80)throw new PartnerError(400,'Informe um item válido.');
 const db=database(),now=Date.now(),id=uid('P-').toUpperCase(),due=now+2*86400000;
 const item:any=await db.prepare('SELECT id,title FROM partner_items WHERE id=? AND tenant_id=?').bind(itemId,tenant).first();
 if(!item)throw new PartnerError(404,'Item não encontrado nesta instituição.');
 const out=await db.prepare(`INSERT INTO partner_requests (id,tenant_id,item_id,subject,status,created_at,due_at)
 SELECT ?,i.tenant_id,i.id,?,'pending',?,? FROM partner_items i WHERE i.id=? AND i.tenant_id=?
 AND i.total>(SELECT COUNT(*) FROM partner_requests r WHERE r.item_id=i.id AND r.tenant_id=i.tenant_id AND r.status='pending' AND r.due_at>?)
 AND NOT EXISTS (SELECT 1 FROM partner_requests r WHERE r.subject=? AND r.tenant_id=i.tenant_id AND r.item_id=i.id AND r.status='pending' AND r.due_at>?)`).bind(id,subject,now,due,itemId,tenant,now,subject,now).run();
 if(!out.meta.changes)throw new PartnerError(409,'Item indisponível ou já reservado por este perfil.');
 return {reservation:{id,itemId,title:item.title,institutionId:tenant,subject,status:'pending',dueAt:due},adapter:'Sistema institucional emulado no mesmo Worker'};
}
