import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/lib/api';

export function InventoryPage() {
   const [search, setSearch] = useState('');
   const [criticalOnly, setCriticalOnly] = useState(false);

   const params = useMemo(() => {
      const p = new URLSearchParams();
      p.set('page', '1');
      p.set('pageSize', '50');
      if (search) p.set('search', search);
      if (criticalOnly) p.set('criticalOnly', 'true');
      return p;
   }, [search, criticalOnly]);

   const { data, isLoading } = useQuery({
      queryKey: ['stocks', params.toString()],
      queryFn: () => api.getStocks(params),
   });

   return (
      <section className="space-y-4">
         <div className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="font-display text-lg">Almoxarifado digital</h2>
            <div className="mt-3 flex flex-col gap-3 md:flex-row">
               <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por SKU ou nome"
                  className="w-full rounded-xl border border-mist px-3 py-2"
               />
               <label className="inline-flex items-center gap-2 text-sm text-steel">
                  <input
                     type="checkbox"
                     checked={criticalOnly}
                     onChange={(e) => setCriticalOnly(e.target.checked)}
                  />
                  Mostrar apenas criticos
               </label>
            </div>
         </div>

         <div className="overflow-x-auto rounded-2xl bg-white p-2 shadow-card">
            <table className="min-w-full text-sm">
               <thead>
                  <tr className="border-b border-mist text-left text-steel">
                     <th className="px-3 py-2">SKU</th>
                     <th className="px-3 py-2">Material</th>
                     <th className="px-3 py-2">Disponivel</th>
                     <th className="px-3 py-2">Reservado</th>
                     <th className="px-3 py-2">Endereco</th>
                     <th className="px-3 py-2">Status</th>
                  </tr>
               </thead>
               <tbody>
                  {isLoading && (
                     <tr>
                        <td className="px-3 py-4 text-steel" colSpan={6}>
                           Carregando estoque...
                        </td>
                     </tr>
                  )}
                  {data?.data.map((stock) => (
                     <tr key={stock.id} className="border-b border-mist/70">
                        <td className="px-3 py-3 font-semibold">{stock.sku}</td>
                        <td className="px-3 py-3">{stock.productName}</td>
                        <td className="px-3 py-3">{stock.quantityAvailable}</td>
                        <td className="px-3 py-3">{stock.quantityReserved}</td>
                        <td className="px-3 py-3">{stock.addressCode}</td>
                        <td className="px-3 py-3">
                           <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${stock.isCritical ? 'bg-ember/20 text-ember' : 'bg-mint/20 text-mint'
                                 }`}
                           >
                              {stock.isCritical ? 'Critico' : 'OK'}
                           </span>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </section>
   );
}
