import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/lib/api';

export function RequestsPage() {
   const queryClient = useQueryClient();
   const [productId, setProductId] = useState('');
   const [qty, setQty] = useState(1);

   const pendingQuery = useQuery({
      queryKey: ['requests', 'PENDENTE'],
      queryFn: () => api.getRequests('PENDENTE'),
   });

   const createMutation = useMutation({
      mutationFn: () =>
         api.createRequest({
            costCenter: 'CC-OPERACOES',
            department: 'OPERACOES',
            items: [{ productId, requestedQty: qty, unit: 'UN' }],
         }),
      onSuccess: () => {
         setProductId('');
         setQty(1);
         queryClient.invalidateQueries({ queryKey: ['requests'] });
      },
   });

   const decideMutation = useMutation({
      mutationFn: ({ requestId, action }: { requestId: string; action: 'APROVAR' | 'RECUSAR' }) =>
         api.decideRequest(requestId, action, action === 'RECUSAR' ? 'Estoque indisponivel' : undefined),
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['requests'] });
      },
   });

   const pending = useMemo(() => pendingQuery.data?.data ?? [], [pendingQuery.data]);

   const onSubmit = (event: FormEvent) => {
      event.preventDefault();
      createMutation.mutate();
   };

   return (
      <section className="space-y-4">
         <article className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="font-display text-lg">Carrinho logistico</h2>
            <form onSubmit={onSubmit} className="mt-3 grid gap-3 md:grid-cols-3">
               <input
                  className="rounded-xl border border-mist px-3 py-2"
                  placeholder="ID do produto"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  required
               />
               <input
                  className="rounded-xl border border-mist px-3 py-2"
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  required
               />
               <button
                  type="submit"
                  className="rounded-xl bg-ink px-4 py-2 font-semibold text-white"
                  disabled={createMutation.isPending}
               >
                  {createMutation.isPending ? 'Enviando...' : 'Solicitar material'}
               </button>
            </form>
         </article>

         <article className="rounded-2xl bg-white p-4 shadow-card">
            <h3 className="font-display text-lg">Fila de conciliacao do almoxarife</h3>
            <div className="mt-3 space-y-3">
               {pending.map((request) => (
                  <div key={request.id} className="rounded-xl border border-mist p-3">
                     <p className="text-sm text-steel">{request.code} - {request.costCenter}</p>
                     <p className="font-semibold">{request.items.length} item(ns) aguardando decisao</p>
                     <div className="mt-3 flex gap-2">
                        <button
                           className="rounded-lg bg-mint px-3 py-1 text-sm font-semibold text-white"
                           onClick={() => decideMutation.mutate({ requestId: request.id, action: 'APROVAR' })}
                        >
                           Aprovar
                        </button>
                        <button
                           className="rounded-lg bg-ember px-3 py-1 text-sm font-semibold text-white"
                           onClick={() => decideMutation.mutate({ requestId: request.id, action: 'RECUSAR' })}
                        >
                           Recusar
                        </button>
                     </div>
                  </div>
               ))}
               {!pending.length && !pendingQuery.isLoading && (
                  <p className="text-sm text-steel">Sem requisicoes pendentes no momento.</p>
               )}
            </div>
         </article>
      </section>
   );
}
