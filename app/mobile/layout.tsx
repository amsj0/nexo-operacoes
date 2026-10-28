import type {Metadata,Viewport} from 'next';
import './mobile.css';
export const metadata:Metadata={title:'Nexo · Minha carteira',description:'Seus serviços institucionais, em uma carteira que acompanha você.',appleWebApp:{capable:true,title:'Nexo',statusBarStyle:'default'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#f7f8f4'};
export default function MobileLayout({children}:{children:React.ReactNode}){return children;}
