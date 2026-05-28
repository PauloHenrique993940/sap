import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { KpiCard } from '../../shared/components/kpi-card';
import { api } from '../../shared/lib/api';

export function DashboardPage() {
   const { data, isLoading } = useQuery({
      queryKey: ['dashboard-summary'],
      queryFn: () => api.getDashboard(),
   });

   if (isLoading || !data) {
      return <p className="text-steel">Carregando painel...</p>;
   }

   return (
      <section className="space-y-5">
         <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard title="Itens em estoque" value={data.kpis.totalItemsOnHand} tone="success" />
            <KpiCard title="Abaixo do minimo" value={data.kpis.criticalProducts} tone="danger" />
            <KpiCard title="Requisicoes pendentes" value={data.kpis.pendingRequests} tone="warning" />
            <KpiCard title="Lotes proximos do vencimento" value={data.kpis.expiringBatches} tone="default" />
         </div>

         <article className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="font-display text-lg">Consumo por centro de custo (30 dias)</h2>
            <div className="mt-4 h-72">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.consumptionByCostCenter}>
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis dataKey="costCenter" />
                     <YAxis />
                     <Tooltip />
                     <Bar dataKey="quantity" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </article>
      </section>
   );
}
