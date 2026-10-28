import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Nexo · Operações compartilhadas',description:'Acervos, pré-reservas e empréstimos em um só lugar.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
