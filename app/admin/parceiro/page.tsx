import {getChatGPTUser,chatGPTSignInPath} from '@/app/chatgpt-auth';
import {isPartnerAdmin} from '@/lib/partner-auth';
import PartnerConsole from './console';
import '../../parceiro.css';
export const dynamic='force-dynamic';
export const metadata={title:'Nexo · Servidor parceiro',description:'Emulador administrativo de autenticação e operações institucionais.'};
export default async function PartnerPage(){const user=await getChatGPTUser();if(!user||!isPartnerAdmin({id:user.userId,email:user.email.toLowerCase()}))return <main className="partner px-locked"><span className="px-logo">n</span><h1>Ambiente do parceiro.</h1><p>O emulador está disponível apenas para o administrador autorizado do piloto.</p><a className="px-button px-primary" href={chatGPTSignInPath('/admin/parceiro')} target="_top">Entrar com a conta autorizada</a><a href="/mobile">Voltar à carteira Nexo</a><small>{user?'A conta atual não possui acesso administrativo.':'É necessário autenticar o acesso privado ao Nexo.'}</small></main>;return <PartnerConsole/>;}
