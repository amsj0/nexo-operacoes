import {requireAdmin,cookieToken,sameOrigin,jsonBody,partnerFailure} from '@/lib/partner-auth';
import {executePartner} from '@/lib/partner-server';
export async function POST(req:Request){try{const actor=requireAdmin(req);sameOrigin(req);return await executePartner(cookieToken(req),actor,await jsonBody(req),new URL(req.url).protocol==='https:');}catch(e){return partnerFailure(e);}}
