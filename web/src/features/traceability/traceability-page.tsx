import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Route, Search, Timeline } from 'lucide-react';
import { api } from '../../shared/lib/api';

export function TraceabilityPage() {
   const [materialSearch, setMaterialSearch] = useState('');
   const [productRef, setProductRef] = useState('');
   const [queryProductRef, setQueryProductRef] = useState('');

   const materialsQuery = useQuery({
      queryKey: ['traceability-materials', materialSearch],
      queryFn: () => api.getMaterials(materialSearch, true),
   });

   const timelineQuery = useQuery({
      queryKey: ['timeline', queryProductRef],
      queryFn: () => api.getTimeline(queryProductRef),
      enabled: !!queryProductRef,
   });

   const materials = useMemo(() => materialsQuery.data?.data ?? [], [materialsQuery.data]);

   return (
      <section className="space-y-4">
         <article className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="font-display text-lg flex items-center gap-2"><Route className="h-5 w-5 text-mint" /> Linha do tempo de rastreabilidade</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(240px,320px)_auto]">
               <div className="relative w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
                  <input
                     value={materialSearch}
                     onChange={(e) => setMaterialSearch(e.target.value)}
                     className="w-full rounded-xl border border-mist py-2 pl-9 pr-3"
                     placeholder="Filtre qualquer produto por SKU ou nome"
                  />
               </div>
               <select
                  value={productRef}
                  onChange={(e) => setProductRef(e.target.value)}
                  className="w-full rounded-xl border border-mist px-3 py-2"
               >
                  <option value="">Selecione o produto</option>
                  {materials.map((material) => (
                     <option key={material.id} value={material.sku}>
                        {material.sku} - {material.name}
                     </option>
                  ))}
               </select>
               <button
                  className="rounded-xl bg-ink px-4 py-2 font-semibold text-white inline-flex items-center gap-2"
                  onClick={() => setQueryProductRef(productRef)}
                  disabled={!productRef.trim()}
               >
                  {timelineQuery.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Buscar
               </button>
            </div>
            {materialsQuery.isLoading && (
               <p className="mt-3 text-sm text-steel inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando produtos...</p>
            )}
         </article>

         <article className="rounded-2xl bg-white p-4 shadow-card">
            <h3 className="mb-3 font-display text-lg flex items-center gap-2"><Timeline className="h-5 w-5 text-mint" /> Eventos de movimentacao</h3>
            <ol className="relative border-s-2 border-mist ps-5">
               {timelineQuery.data?.data.map((step) => (
                  <li key={step.id} className="mb-6 ms-2">
                     <span className="absolute -start-[9px] mt-1 h-4 w-4 rounded-full bg-mint" />
                     <p className="text-xs text-steel">{new Date(step.performedAt).toLocaleString('pt-BR')}</p>
                     <p className="font-semibold">{step.movementType} - Qtd: {step.quantity}</p>
                     <p className="text-sm text-steel">
                        {step.from?.addressCode ?? 'Origem nao informada'} {'->'}{' '}
                        {step.to?.addressCode ?? 'Destino nao informado'}
                     </p>
                  </li>
               ))}
               {!timelineQuery.isLoading && !timelineQuery.data?.data.length && (
                  <li className="text-sm text-steel inline-flex items-center gap-2"><Route className="h-4 w-4" /> Filtre e selecione qualquer produto para visualizar a trilha.</li>
               )}
            </ol>
         </article>
      </section>
   );
}
