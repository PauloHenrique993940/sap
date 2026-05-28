import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/lib/api';

export function TraceabilityPage() {
   const [productId, setProductId] = useState('');
   const [queryProductId, setQueryProductId] = useState('');

   const timelineQuery = useQuery({
      queryKey: ['timeline', queryProductId],
      queryFn: () => api.getTimeline(queryProductId),
      enabled: !!queryProductId,
   });

   return (
      <section className="space-y-4">
         <article className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="font-display text-lg">Linha do tempo de rastreabilidade</h2>
            <div className="mt-3 flex gap-2">
               <input
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full rounded-xl border border-mist px-3 py-2"
                  placeholder="Digite o productId"
               />
               <button
                  className="rounded-xl bg-ink px-4 py-2 font-semibold text-white"
                  onClick={() => setQueryProductId(productId)}
               >
                  Buscar
               </button>
            </div>
         </article>

         <article className="rounded-2xl bg-white p-4 shadow-card">
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
                  <li className="text-sm text-steel">Informe um productId para visualizar a trilha.</li>
               )}
            </ol>
         </article>
      </section>
   );
}
