export type Item={id:string;title:string;subtitle:string;category:string;type:string;code:string;total:number;available:number;color:string;created_at:number};
export type Person={id:string;name:string;email:string;department:string;active:number};
export type Operation={id:string;item_id:string;person_id:string;status:string;created_at:number;due_at:number;loaned_at:number|null;returned_at:number|null;renewals:number;title:string;name:string;email:string;type:string;color:string;code:string};
export type Workspace={items:Item[];people:Person[];operations:Operation[];audit:{id:string;action:string;detail:string;created_at:number}[];settings:{institution:string;loan_days:number;hold_days:number;max_loans:number};now:number};
