import { Link, Outlet, useLocation } from 'react-router-dom';

const links = [
   { to: '/', label: 'Painel' },
   { to: '/inventory', label: 'Estoque' },
   { to: '/requests', label: 'Requisicoes' },
   { to: '/traceability', label: 'Rastreio' },
];

export function AppLayout() {
   const location = useLocation();

   return (
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-24 pt-6 md:px-8 md:pb-8">
         <header className="mb-6 rounded-3xl bg-white/80 p-5 shadow-card backdrop-blur">
            <h1 className="font-display text-2xl text-ink md:text-3xl">Warehouse Control Center</h1>
            <p className="mt-1 text-sm text-steel">Governanca de materiais com trilha de auditoria estilo SAP MM/WM.</p>
         </header>

         <main className="flex-1">
            <Outlet />
         </main>

         <nav className="fixed bottom-3 left-1/2 z-20 w-[95%] -translate-x-1/2 rounded-2xl bg-ink p-2 shadow-card md:static md:mt-8 md:w-full md:translate-x-0">
            <ul className="grid grid-cols-4 gap-2">
               {links.map((link) => {
                  const active = location.pathname === link.to;
                  return (
                     <li key={link.to}>
                        <Link
                           to={link.to}
                           className={`block rounded-xl px-3 py-2 text-center text-xs font-semibold transition md:text-sm ${active ? 'bg-mint text-white' : 'text-mist hover:bg-steel'
                              }`}
                        >
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
