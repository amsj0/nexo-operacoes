import { snapshot } from '@/lib/server';
export async function GET() {
 try { return Response.json(await snapshot(),{headers:{'Cache-Control':'no-store'}}); }
 catch { return Response.json({error:'Não foi possível carregar os registros. Tente novamente.'},{status:503}); }
}
