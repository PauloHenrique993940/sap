import { Link, Outlet, useLocation } from 'react-router-dom';
import { Boxes, ClipboardList, Home, Route, Warehouse } from 'lucide-react';

const links = [
   { to: '/', label: 'Painel', icon: Home },
   { to: '/inventory', label: 'Estoque', icon: Boxes },
   { to: '/requests', label: 'Requisicoes', icon: ClipboardList },
   { to: '/traceability', label: 'Rastreio', icon: Route },
];

export function AppLayout() {
   const location = useLocation();

   return (
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-24 pt-6 md:px-8 md:pb-8">
         <header className="mb-6 rounded-3xl bg-white/80 p-5 shadow-card backdrop-blur">
            <h1 className="font-display text-2xl text-ink md:text-3xl flex items-center gap-2">
               <Warehouse className="h-7 w-7 text-mint" />
               Warehouse Control Center
            </h1>
            <p className="mt-1 text-sm text-steel">Governanca de materiais com trilha de auditoria estilo SAP MM/WM.</p>
         </header>

         <main className="flex-1">
            <Outlet />
         </main>

         <nav className="fixed bottom-3 left-1/2 z-20 w-[95%] -translate-x-1/2 rounded-2xl bg-ink p-2 shadow-card md:static md:mt-8 md:w-full md:translate-x-0">
            <ul className="grid grid-cols-4 gap-2">
               {links.map((link) => {
                  const Icon = link.icon;
                  const active = location.pathname === link.to;
                  return (
                     <li key={link.to}>
                        <Link
                           to={link.to}
                           className={`flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-center text-xs font-semibold transition md:text-sm ${active ? 'bg-mint text-white' : 'text-mist hover:bg-steel'
                              }`}
                        >
                           <Icon className="h-4 w-4" />
                           {link.label}
                        </Link>
                     </li>
                  );
               })}
            </ul>
         </nav>
      </div>
   );
}
