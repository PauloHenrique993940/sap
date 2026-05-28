import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
   AlertTriangle,
   BarChart3,
   BellRing,
   CheckCheck,
   ClipboardClock,
   Info,
   PackageOpen,
   PackageSearch,
   PackageCheck,
   ShieldAlert,
   Siren,
   TriangleAlert,
} from 'lucide-react';
import { KpiCard } from '../../shared/components/kpi-card';
import { api } from '../../shared/lib/api';

export function DashboardPage() {
   const [selectedRequestStatus, setSelectedRequestStatus] = useState<'APROVADO' | 'EM_SEPARACAO' | 'AGUARDANDO_RETIRADA'>('APROVADO');

   const { data, isLoading, isError, error } = useQuery({
      queryKey: ['dashboard-summary'],
      queryFn: () => api.getDashboard(),
   });

   const approvedRequestsQuery = useQuery({
      queryKey: ['dashboard-requests', 'APROVADO'],
      queryFn: () => api.getRequests('APROVADO'),
   });

   const deliveredRequestsQuery = useQuery({
      queryKey: ['dashboard-requests', 'AGUARDANDO_RETIRADA'],
      queryFn: () => api.getRequests('AGUARDANDO_RETIRADA'),
   });

   const approvedRequests = useMemo(() => approvedRequestsQuery.data?.data ?? [], [approvedRequestsQuery.data]);
   const deliveredRequests = useMemo(() => deliveredRequestsQuery.data?.data ?? [], [deliveredRequestsQuery.data]);

   const dashboardNotifications = useMemo(() => {
      if (!data) {
         return [] as Array<{ id: string; tone: 'danger' | 'warning' | 'info'; text: string }>;
      }

      const notifications: Array<{ id: string; tone: 'danger' | 'warning' | 'info'; text: string }> = [];

      if (data.kpis.criticalProducts > 0) {
         notifications.push({
            id: 'critical-products',
            tone: 'danger',
            text: `${data.kpis.criticalProducts} material(is) abaixo do estoque minimo.`,
         });
      }

      if (data.kpis.pendingRequests > 0) {
         notifications.push({
            id: 'pending-requests',
            tone: 'warning',
            text: `${data.kpis.pendingRequests} requisicao(oes) pendente(s) aguardando conciliacao.`,
         });
      }

      if (data.kpis.expiringBatches > 0) {
         notifications.push({
            id: 'expiring-batches',
            tone: 'warning',
            text: `${data.kpis.expiringBatches} lote(s) proximo(s) do vencimento.`,
         });
      }

      if (approvedRequests.length > 0) {
         notifications.push({
            id: 'approved-requests',
            tone: 'info',
            text: `${approvedRequests.length} requisicao(oes) aprovada(s) pronta(s) para separacao.`,
         });
      }

      if (deliveredRequests.length > 0) {
         notifications.push({
            id: 'delivered-requests',
            tone: 'info',
            text: `${deliveredRequests.length} requisicao(oes) aguardando retirada.`,
         });
      }

      return notifications;
   }, [data, approvedRequests.length, deliveredRequests.length]);

   const statusList = useMemo(() => {
      if (selectedRequestStatus === 'AGUARDANDO_RETIRADA') {
         return deliveredRequests;
      }

      if (selectedRequestStatus === 'EM_SEPARACAO') {
         return approvedRequests.filter((request: any) =>
            request.items?.some((item: any) => item.approvedQty !== null && item.deliveredQty == null)
         );
      }

      return approvedRequests.filter((request: any) =>
         request.items?.every((item: any) => item.approvedQty == null)
      );
   }, [selectedRequestStatus, approvedRequests, deliveredRequests]);

   if (isLoading) {
      return <p className="text-steel flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Carregando painel...</p>;
   }

   if (isError) {
      return (
         <article className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="font-display text-lg text-ink flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-ember" /> Falha ao carregar o painel</h2>
            <p className="mt-2 text-sm text-steel">{error instanceof Error ? error.message : 'Erro inesperado na consulta do dashboard.'}</p>
         </article>
      );
   }

   if (!data) {
      return (
         <article className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="font-display text-lg text-ink flex items-center gap-2"><TriangleAlert className="h-5 w-5 text-sun" /> Painel sem dados</h2>
            <p className="mt-2 text-sm text-steel">Nenhuma informacao operacional disponivel no momento.</p>
         </article>
      );
   }

   const operationState =
      data.kpis.criticalProducts > 0 ? 'Atencao: materiais abaixo do minimo' :
         data.kpis.pendingRequests > 10 ? 'Backlog elevado de requisicoes' :
            'Operacao estavel';

   return (
      <section className="space-y-5">
         <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard title="Itens em estoque" value={data.kpis.totalItemsOnHand} tone="success" description="Saldo fisico consolidado" icon={<PackageCheck className="h-4 w-4" />} />
            <KpiCard title="Abaixo do minimo" value={data.kpis.criticalProducts} tone="danger" description="Reposicao urgente" icon={<Siren className="h-4 w-4" />} />
            <KpiCard title="Requisicoes pendentes" value={data.kpis.pendingRequests} tone="warning" description="Aguardando conciliacao" icon={<ClipboardClock className="h-4 w-4" />} />
            <KpiCard title="Lotes proximos do vencimento" value={data.kpis.expiringBatches} tone="default" description="Risco de perda" icon={<ShieldAlert className="h-4 w-4" />} />
         </div>

         {dashboardNotifications.length > 0 && (
            <article className="rounded-2xl bg-white p-4 shadow-card">
               <h2 className="font-display text-lg flex items-center gap-2"><BellRing className="h-5 w-5 text-mint" /> Notificacoes</h2>
               <div className="mt-3 space-y-2">
                  {dashboardNotifications.map((notification) => (
                     <p
                        key={notification.id}
                        className={`rounded-xl px-3 py-2 text-sm inline-flex items-center gap-2 ${notification.tone === 'danger'
                           ? 'bg-ember/10 text-ember'
                           : notification.tone === 'warning'
                              ? 'bg-sun/15 text-ink'
                              : 'bg-mint/10 text-ink'
                           }`}
                     >
                        {notification.tone === 'info' ? <Info className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        {notification.text}
                     </p>
                  ))}
               </div>
            </article>
         )}

         <article className="rounded-2xl bg-ink p-4 text-mist shadow-card">
            <h2 className="font-display text-lg text-white flex items-center gap-2"><BarChart3 className="h-5 w-5 text-mint" /> Torre de Controle Logistica</h2>
            <p className="mt-1 text-sm">{operationState}</p>
            <div className="mt-3 grid gap-2 text-xs md:grid-cols-3 md:text-sm">
               <p className="rounded-xl bg-white/10 px-3 py-2">Separacao e conferencia em tempo real</p>
               <p className="rounded-xl bg-white/10 px-3 py-2">Rastreabilidade por lote e endereco</p>
               <p className="rounded-xl bg-white/10 px-3 py-2">Priorizacao por criticidade e SLA</p>
            </div>
         </article>

         <article className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="font-display text-lg flex items-center gap-2"><PackageSearch className="h-5 w-5 text-mint" /> Painel de status de requisicoes</h2>
            <div className="mt-3 flex flex-wrap gap-2">
               <button
                  type="button"
                  className={`rounded-xl px-3 py-2 text-xs font-semibold inline-flex items-center gap-1 ${selectedRequestStatus === 'APROVADO' ? 'bg-mint text-white' : 'bg-mist text-ink'}`}
                  onClick={() => setSelectedRequestStatus('APROVADO')}
               >
                  <CheckCheck className="h-4 w-4" />
                  Aprovado
               </button>
               <button
                  type="button"
                  className={`rounded-xl px-3 py-2 text-xs font-semibold inline-flex items-center gap-1 ${selectedRequestStatus === 'EM_SEPARACAO' ? 'bg-sun text-ink' : 'bg-mist text-ink'}`}
                  onClick={() => setSelectedRequestStatus('EM_SEPARACAO')}
               >
                  <PackageOpen className="h-4 w-4" />
                  Em separacao
               </button>
               <button
                  type="button"
                  className={`rounded-xl px-3 py-2 text-xs font-semibold inline-flex items-center gap-1 ${selectedRequestStatus === 'AGUARDANDO_RETIRADA' ? 'bg-ink text-white' : 'bg-mist text-ink'}`}
                  onClick={() => setSelectedRequestStatus('AGUARDANDO_RETIRADA')}
               >
                  <PackageCheck className="h-4 w-4" />
                  Aguardando retirada
               </button>
            </div>

            <div className="mt-3 space-y-2">
               {(approvedRequestsQuery.isLoading || deliveredRequestsQuery.isLoading) && (
                  <p className="text-sm text-steel inline-flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Carregando status...</p>
               )}

               {!approvedRequestsQuery.isLoading && !deliveredRequestsQuery.isLoading && !statusList.length && (
                  <p className="text-sm text-steel">Nenhum item encontrado para este status.</p>
               )}

               {statusList.map((request: any) => (
                  <div key={request.id} className="rounded-xl border border-mist p-3">
                     <p className="text-sm text-steel">{request.code} - {request.costCenter}</p>
                     <p className="font-semibold">{request.items?.length ?? 0} item(ns) neste status</p>
                  </div>
               ))}
            </div>
         </article>

         <article className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="font-display text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-mint" /> Consumo por centro de custo (30 dias)</h2>
            <div className="mt-4 h-72">
               {data.consumptionByCostCenter.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={data.consumptionByCostCenter}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="costCenter" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="quantity" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                     </BarChart>
                  </ResponsiveContainer>
               ) : (
                  <div className="grid h-full place-items-center rounded-xl border border-dashed border-mist">
                     <p className="text-sm text-steel">Sem consumo registrado para o periodo.</p>
                  </div>
               )}
            </div>
         </article>
      </section>
   );
}
