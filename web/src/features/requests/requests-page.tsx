import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BellRing, CheckCircle2, ClipboardList, Loader2, PackageCheck, PackageOpen, PackageSearch, RefreshCw, Send, ShieldX } from 'lucide-react';
import { api } from '../../shared/lib/api';

export function RequestsPage() {
   const queryClient = useQueryClient();
   const [productRef, setProductRef] = useState('');
   const [materialSearch, setMaterialSearch] = useState('');
   const [qty, setQty] = useState(1);
   const [costCenter, setCostCenter] = useState('CC-OPERACOES');
   const [department, setDepartment] = useState('OPERACOES');
   const [notes, setNotes] = useState('');
   const [selectedStatus, setSelectedStatus] = useState<'APROVADO' | 'EM_SEPARACAO' | 'AGUARDANDO_RETIRADA'>('APROVADO');

   const materialsQuery = useQuery({
      queryKey: ['request-materials', materialSearch],
      queryFn: () => api.getMaterials(materialSearch, true),
   });

   const pendingQuery = useQuery({
      queryKey: ['requests', 'PENDENTE'],
      queryFn: () => api.getRequests('PENDENTE'),
   });

   const approvedQuery = useQuery({
      queryKey: ['requests', 'APROVADO'],
      queryFn: () => api.getRequests('APROVADO'),
   });

   const deliveredQuery = useQuery({
      queryKey: ['requests', 'AGUARDANDO_RETIRADA'],
      queryFn: () => api.getRequests('AGUARDANDO_RETIRADA'),
   });

   const createMutation = useMutation({
      mutationFn: () =>
         api.createRequest({
            costCenter,
            department,
            notes,
            items: [{ productId: productRef, requestedQty: qty, unit: 'UN' }],
         }),
      onSuccess: () => {
         setProductRef('');
         setMaterialSearch('');
         setQty(1);
         setNotes('');
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
   const approved = useMemo(() => approvedQuery.data?.data ?? [], [approvedQuery.data]);
   const delivered = useMemo(() => deliveredQuery.data?.data ?? [], [deliveredQuery.data]);
   const materials = useMemo(() => materialsQuery.data?.data ?? [], [materialsQuery.data]);

   const statusItems = useMemo(() => {
      if (selectedStatus === 'AGUARDANDO_RETIRADA') {
         return delivered;
      }

      if (selectedStatus === 'EM_SEPARACAO') {
         return approved.filter((request: any) =>
            request.items?.some((item: any) => item.approvedQty !== null && item.deliveredQty == null)
         );
      }

      return approved.filter((request: any) =>
         request.items?.every((item: any) => item.approvedQty == null)
      );
   }, [selectedStatus, approved, delivered]);

   const statusNotification = useMemo(() => {
      if (pending.length > 0) {
         return {
            tone: 'warning' as const,
            text: `${pending.length} requisicao(oes) pendente(s) aguardando decisao.`,
         };
      }

      if (approved.length > 0) {
         return {
            tone: 'success' as const,
            text: `${approved.length} requisicao(oes) aprovada(s) pronta(s) para separacao.`,
         };
      }

      return {
         tone: 'default' as const,
         text: 'Sem alertas de status no momento.',
      };
   }, [pending.length, approved.length]);

   const notificationToneClass =
      statusNotification.tone === 'warning'
         ? 'border-sun/30 bg-sun/10 text-ink'
         : statusNotification.tone === 'success'
            ? 'border-mint/30 bg-mint/10 text-ink'
            : 'border-mist bg-slate/5 text-steel';

   const onSubmit = (event: FormEvent) => {
      event.preventDefault();
      createMutation.mutate();
   };

   return (
      <section className="space-y-4">
         <article className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="font-display text-lg flex items-center gap-2"><PackageSearch className="h-5 w-5 text-mint" /> Informacoes por status</h2>
            <div className="mt-3 flex flex-wrap gap-2">
               <button
                  type="button"
                  className={`rounded-xl px-3 py-2 text-xs font-semibold inline-flex items-center gap-1 ${selectedStatus === 'APROVADO' ? 'bg-mint text-white' : 'bg-mist text-ink'}`}
                  onClick={() => setSelectedStatus('APROVADO')}
               >
                  <CheckCircle2 className="h-4 w-4" />
                  Aprovado
               </button>
               <button
                  type="button"
                  className={`rounded-xl px-3 py-2 text-xs font-semibold inline-flex items-center gap-1 ${selectedStatus === 'EM_SEPARACAO' ? 'bg-sun text-ink' : 'bg-mist text-ink'}`}
                  onClick={() => setSelectedStatus('EM_SEPARACAO')}
               >
                  <PackageOpen className="h-4 w-4" />
                  Em separacao
               </button>
               <button
                  type="button"
                  className={`rounded-xl px-3 py-2 text-xs font-semibold inline-flex items-center gap-1 ${selectedStatus === 'AGUARDANDO_RETIRADA' ? 'bg-ink text-white' : 'bg-mist text-ink'}`}
                  onClick={() => setSelectedStatus('AGUARDANDO_RETIRADA')}
               >
                  <PackageCheck className="h-4 w-4" />
                  Aguardando retirada
               </button>
            </div>

            <div className="mt-3 space-y-2">
               {(approvedQuery.isLoading || deliveredQuery.isLoading) && (
                  <p className="text-sm text-steel inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando informacoes de status...</p>
               )}

               {!approvedQuery.isLoading && !deliveredQuery.isLoading && !statusItems.length && (
                  <p className="text-sm text-steel">Nenhuma requisicao encontrada para este status.</p>
               )}

               {statusItems.map((request: any) => (
                  <div key={request.id} className="rounded-xl border border-mist p-3">
                     <p className="text-sm text-steel">{request.code} - {request.costCenter}</p>
                     <p className="font-semibold">{request.items?.length ?? 0} item(ns)</p>
                  </div>
               ))}
            </div>
         </article>

         <article className={`rounded-2xl border p-3 shadow-card ${notificationToneClass}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
               <p className="text-sm inline-flex items-center gap-2">
                  <BellRing className="h-4 w-4" />
                  {statusNotification.text}
               </p>

               <div className="flex flex-wrap gap-2">
                  <button
                     type="button"
                     className="rounded-lg border border-mist px-3 py-1 text-xs font-semibold text-ink inline-flex items-center gap-1"
                     onClick={() => pendingQuery.refetch()}
                     disabled={pendingQuery.isFetching}
                  >
                     <RefreshCw className={`h-3 w-3 ${pendingQuery.isFetching ? 'animate-spin' : ''}`} />
                     Atualizar pendentes
                  </button>
                  <button
                     type="button"
                     className="rounded-lg border border-mist px-3 py-1 text-xs font-semibold text-ink inline-flex items-center gap-1"
                     onClick={() => approvedQuery.refetch()}
                     disabled={approvedQuery.isFetching}
                  >
                     <RefreshCw className={`h-3 w-3 ${approvedQuery.isFetching ? 'animate-spin' : ''}`} />
                     Atualizar aprovadas
                  </button>
               </div>
            </div>
         </article>

         <article className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="font-display text-lg flex items-center gap-2"><ClipboardList className="h-5 w-5 text-mint" /> Carrinho logistico</h2>
            <form onSubmit={onSubmit} className="mt-3 grid gap-3 md:grid-cols-2">
               <input
                  className="rounded-xl border border-mist px-3 py-2"
                  placeholder="Centro de custo"
                  value={costCenter}
                  onChange={(e) => setCostCenter(e.target.value)}
                  required
               />
               <input
                  className="rounded-xl border border-mist px-3 py-2"
                  placeholder="Departamento"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
               />
               <input
                  className="rounded-xl border border-mist px-3 py-2"
                  placeholder="Filtrar material por SKU ou nome"
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  required
               />
               <select
                  className="rounded-xl border border-mist px-3 py-2"
                  value={productRef}
                  onChange={(e) => setProductRef(e.target.value)}
                  required
               >
                  <option value="">Selecione o item</option>
                  {materials.map((material) => (
                     <option key={material.id} value={material.sku}>
                        {material.sku} - {material.name}
                     </option>
                  ))}
               </select>
               <input
                  className="rounded-xl border border-mist px-3 py-2"
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  required
               />
               <input
                  className="rounded-xl border border-mist px-3 py-2 md:col-span-2"
                  placeholder="Observacoes operacionais"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
               />
               <button
                  type="submit"
                  className="rounded-xl bg-ink px-4 py-2 font-semibold text-white md:col-span-2 inline-flex items-center justify-center gap-2"
                  disabled={createMutation.isPending || !productRef.trim()}
               >
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {createMutation.isPending ? 'Enviando...' : 'Solicitar material'}
               </button>
            </form>
            {createMutation.isError && (
               <p className="mt-3 text-sm text-ember inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {createMutation.error instanceof Error ? createMutation.error.message : 'Falha ao criar requisicao.'}</p>
            )}
         </article>

         {(pendingQuery.isError || approvedQuery.isError || deliveredQuery.isError) && (
            <article className="rounded-2xl bg-white p-4 shadow-card">
               <p className="text-sm text-ember inline-flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {pendingQuery.error instanceof Error
                     ? pendingQuery.error.message
                     : approvedQuery.error instanceof Error
                        ? approvedQuery.error.message
                        : deliveredQuery.error instanceof Error
                           ? deliveredQuery.error.message
                           : 'Falha ao atualizar status das requisicoes.'}
               </p>
            </article>
         )}

         <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl bg-white p-4 shadow-card">
               <h3 className="font-display text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-sun" /> Fila de conciliacao <span className="rounded-full bg-sun/15 px-2 py-1 text-xs font-semibold text-ink">{pending.length}</span></h3>
               <div className="mt-3 space-y-3">
                  {pending.map((request) => (
                     <div key={request.id} className="rounded-xl border border-mist p-3">
                        <p className="text-sm text-steel">{request.code} - {request.costCenter}</p>
                        <p className="font-semibold">{request.items.length} item(ns) aguardando decisao</p>
                        <div className="mt-3 flex gap-2">
                           <button
                              className="rounded-lg bg-mint px-3 py-1 text-sm font-semibold text-white"
                              onClick={() => decideMutation.mutate({ requestId: request.id, action: 'APROVAR' })}
                              disabled={decideMutation.isPending}
                           >
                              <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Aprovar</span>
                           </button>
                           <button
                              className="rounded-lg bg-ember px-3 py-1 text-sm font-semibold text-white"
                              onClick={() => decideMutation.mutate({ requestId: request.id, action: 'RECUSAR' })}
                              disabled={decideMutation.isPending}
                           >
                              <span className="inline-flex items-center gap-1"><ShieldX className="h-3 w-3" /> Recusar</span>
                           </button>
                        </div>
                     </div>
                  ))}
                  {!pending.length && !pendingQuery.isLoading && (
                     <p className="text-sm text-steel inline-flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Sem requisicoes pendentes no momento.</p>
                  )}
               </div>
            </article>

            <article className="rounded-2xl bg-white p-4 shadow-card">
               <h3 className="font-display text-lg flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-mint" /> Prontas para separacao <span className="rounded-full bg-mint/15 px-2 py-1 text-xs font-semibold text-ink">{approved.length}</span></h3>
               <div className="mt-3 space-y-3">
                  {approved.map((request) => (
                     <div key={request.id} className="rounded-xl border border-mist p-3">
                        <p className="text-sm text-steel">{request.code} - {request.costCenter}</p>
                        <p className="font-semibold">{request.items.length} item(ns) aprovados</p>
                        <p className="mt-1 text-xs text-steel">Priorizar picking por endereco e lote FEFO.</p>
                     </div>
                  ))}
                  {!approved.length && !approvedQuery.isLoading && (
                     <p className="text-sm text-steel inline-flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Sem requisicoes aprovadas para separacao.</p>
                  )}
               </div>
            </article>
         </div>
      </section>
   );
}
