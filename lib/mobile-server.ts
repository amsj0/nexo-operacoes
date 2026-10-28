import {database,snapshot} from './server';
import {defaultWallet,validWallet} from './mobile-services';
export async function mobileSnapshot(personId='p1') {
 const data:any=await snapshot();
 const person=data.people.find((p:any)=>p.id===personId&&p.active===1);
 if(!person)throw new Error('Perfil de demonstração indisponível.');
 const saved:any=await database().prepare('SELECT services FROM mobile_wallets WHERE person_id=?').bind(person.id).first();
 let selected=defaultWallet;
 if(saved){try{const parsed=JSON.parse(saved.services);if(validWallet(parsed))selected=parsed;}catch{}}
 return {person,people:data.people.filter((p:any)=>p.active===1).map((p:any)=>({id:p.id,name:p.name,department:p.department})),items:data.items,operations:data.operations.filter((o:any)=>o.person_id===person.id),settings:data.settings,selected,now:data.now};
}
