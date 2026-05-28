import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
   AlertTriangle,
   Archive,
   Boxes,
   CheckCircle2,
   Loader2,
   PackagePlus,
   Pencil,
   Search,
   Trash2,
} from 'lucide-react';
import { api } from '../../shared/lib/api';

export function InventoryPage() {
   const queryClient = useQueryClient();
   const [search, setSearch] = useState('');
   const [criticalOnly, setCriticalOnly] = useState(false);
   const [materialSearch, setMaterialSearch] = useState('');
   const [materialActiveOnly, setMaterialActiveOnly] = useState(true);
   const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);

   const [materialForm, setMaterialForm] = useState({
      sku: '',
      name: '',
      categoryName: '',
      unit: 'UN' as 'UN' | 'KG' | 'CX',
      minStock: 0,
      maxStock: 0,
      costPrice: 0,
      description: '',
      barcode: '',
   });

   const params = useMemo(() => {
      const p = new URLSearchParams();
      p.set('page', '1');
      p.set('pageSize', '50');
      if (search) p.set('search', search);
      if (criticalOnly) p.set('criticalOnly', 'true');
      return p;
   }, [search, criticalOnly]);

   const { data, isLoading, isError, error } = useQuery({
      queryKey: ['stocks', params.toString()],
      queryFn: () => api.getStocks(params),
   });

   const materialsQuery = useQuery({
      queryKey: ['materials', materialSearch, materialActiveOnly],
      queryFn: () => api.getMaterials(materialSearch, materialActiveOnly),
   });

   const createMaterialMutation = useMutation({
      mutationFn: () =>
         api.createMaterial({
            sku: materialForm.sku,
            name: materialForm.name,
            categoryName: materialForm.categoryName,
            unit: materialForm.unit,
            minStock: Number(materialForm.minStock),
            maxStock: Number(materialForm.maxStock) || null,
            costPrice: Number(materialForm.costPrice),
            description: materialForm.description || null,
            barcode: materialForm.barcode || null,
         }),
      onSuccess: () => {
         resetForm();
         queryClient.invalidateQueries({ queryKey: ['materials'] });
      },
   });

   const updateMaterialMutation = useMutation({
      mutationFn: () =>
         api.updateMaterial(editingMaterialId as string, {
            sku: materialForm.sku,
            name: materialForm.name,
            categoryName: materialForm.categoryName,
            unit: materialForm.unit,
            minStock: Number(materialForm.minStock),
            maxStock: Number(materialForm.maxStock) || null,
            costPrice: Number(materialForm.costPrice),
            description: materialForm.description || null,
            barcode: materialForm.barcode || null,
         }),
      onSuccess: () => {
         resetForm();
         queryClient.invalidateQueries({ queryKey: ['materials'] });
      },
   });

   const deleteMaterialMutation = useMutation({
      mutationFn: (id: string) => api.deleteMaterial(id),
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['materials'] });
      },
   });

   const totalAvailable = data?.data.reduce((acc, item) => acc + item.quantityAvailable, 0) ?? 0;
   const totalReserved = data?.data.reduce((acc, item) => acc + item.quantityReserved, 0) ?? 0;
   const criticalCount = data?.data.filter((item) => item.isCritical).length ?? 0;

   const materials = materialsQuery.data?.data ?? [];

   function resetForm() {
      setEditingMaterialId(null);
      setMaterialForm({
         sku: '',
         name: '',
         categoryName: '',
         unit: 'UN',
         minStock: 0,
         maxStock: 0,
         costPrice: 0,
         description: '',
         barcode: '',
      });
   }

   function startEdit(material: (typeof materials)[number]) {
      setEditingMaterialId(material.id);
      setMaterialForm({
         sku: material.sku,
         name: material.name,
         categoryName: material.category.name,
         unit: material.unit,
         minStock: material.minStock,
         maxStock: material.maxStock ?? 0,
         costPrice: Number(material.costPrice),
         description: material.description ?? '',
         barcode: material.barcode ?? '',
      });
   }

   const isSubmitting = createMaterialMutation.isPending || updateMaterialMutation.isPending;

   function submitMaterialForm(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      if (editingMaterialId) {
         updateMaterialMutation.mutate();
         return;
      }
      createMaterialMutation.mutate();
   }

   return (
      <section className="space-y-4">
         {isError && (
            <article className="rounded-2xl bg-white p-4 shadow-card">
               <p className="text-sm text-ember flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {error instanceof Error ? error.message : 'Falha ao consultar estoque.'}</p>
            </article>
         )}

         <div className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="font-display text-lg flex items-center gap-2"><Boxes className="h-5 w-5 text-mint" /> Almoxarifado digital</h2>
            <p className="mt-1 text-sm text-steel">Visao consolidada de saldo, reserva e criticidade por endereco.</p>
            <div className="mt-3 flex flex-col gap-3 md:flex-row">
               <div className="relative w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
                  <input
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     placeholder="Buscar por SKU ou nome"
                     className="w-full rounded-xl border border-mist py-2 pl-9 pr-3"
                  />
               </div>
               <label className="inline-flex items-center gap-2 text-sm text-steel">
                  <input
                     type="checkbox"
                     checked={criticalOnly}
                     onChange={(e) => setCriticalOnly(e.target.checked)}
                  />
                  Mostrar apenas criticos
               </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
               <div className="rounded-xl bg-mint/10 px-3 py-2 text-ink flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-mint" /> Disponivel total: <strong>{totalAvailable}</strong></div>
               <div className="rounded-xl bg-sun/10 px-3 py-2 text-ink flex items-center gap-2"><Archive className="h-4 w-4 text-sun" /> Reservado total: <strong>{totalReserved}</strong></div>
               <div className="rounded-xl bg-ember/10 px-3 py-2 text-ink flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-ember" /> Itens criticos: <strong>{criticalCount}</strong></div>
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
                           <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando estoque...</span>
                        </td>
                     </tr>
                  )}
                  {!isLoading && !data?.data.length && (
                     <tr>
                        <td className="px-3 py-4 text-steel" colSpan={6}>
                           Nenhum item encontrado para os filtros selecionados.
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

         <article className="rounded-2xl bg-white p-4 shadow-card">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
               <div>
                  <h2 className="font-display text-lg flex items-center gap-2"><PackagePlus className="h-5 w-5 text-mint" /> Cadastro de materiais</h2>
                  <p className="text-sm text-steel">Adicione, edite e inative materiais do catalogo logistico.</p>
               </div>
               <div className="flex items-center gap-2">
                  <div className="relative">
                     <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
                     <input
                        value={materialSearch}
                        onChange={(e) => setMaterialSearch(e.target.value)}
                        placeholder="Buscar material"
                        className="rounded-xl border border-mist py-2 pl-9 pr-3 text-sm"
                     />
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-steel">
                     <input
                        type="checkbox"
                        checked={materialActiveOnly}
                        onChange={(e) => setMaterialActiveOnly(e.target.checked)}
                     />
                     Apenas ativos
                  </label>
               </div>
            </div>

            <form onSubmit={submitMaterialForm} className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
               <input
                  className="rounded-xl border border-mist px-3 py-2"
                  placeholder="SKU"
                  value={materialForm.sku}
                  onChange={(e) => setMaterialForm((prev) => ({ ...prev, sku: e.target.value }))}
                  required
               />
               <input
                  className="rounded-xl border border-mist px-3 py-2"
                  placeholder="Nome"
                  value={materialForm.name}
                  onChange={(e) => setMaterialForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
               />
               <input
                  className="rounded-xl border border-mist px-3 py-2"
                  placeholder="Categoria"
                  value={materialForm.categoryName}
                  onChange={(e) => setMaterialForm((prev) => ({ ...prev, categoryName: e.target.value }))}
                  required
               />
               <select
                  className="rounded-xl border border-mist px-3 py-2"
                  value={materialForm.unit}
                  onChange={(e) => setMaterialForm((prev) => ({ ...prev, unit: e.target.value as 'UN' | 'KG' | 'CX' }))}
               >
                  <option value="UN">UN</option>
                  <option value="KG">KG</option>
                  <option value="CX">CX</option>
               </select>
               <input
                  className="rounded-xl border border-mist px-3 py-2"
                  type="number"
                  min={0}
                  placeholder="Estoque minimo"
                  value={materialForm.minStock}
                  onChange={(e) => setMaterialForm((prev) => ({ ...prev, minStock: Number(e.target.value) }))}
               />
               <input
                  className="rounded-xl border border-mist px-3 py-2"
                  type="number"
                  min={0}
                  placeholder="Estoque maximo"
                  value={materialForm.maxStock}
                  onChange={(e) => setMaterialForm((prev) => ({ ...prev, maxStock: Number(e.target.value) }))}
               />
               <input
                  className="rounded-xl border border-mist px-3 py-2"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Custo"
                  value={materialForm.costPrice}
                  onChange={(e) => setMaterialForm((prev) => ({ ...prev, costPrice: Number(e.target.value) }))}
               />
               <input
                  className="rounded-xl border border-mist px-3 py-2"
                  placeholder="Codigo de barras"
                  value={materialForm.barcode}
                  onChange={(e) => setMaterialForm((prev) => ({ ...prev, barcode: e.target.value }))}
               />
               <input
                  className="rounded-xl border border-mist px-3 py-2 md:col-span-3"
                  placeholder="Descricao"
                  value={materialForm.description}
                  onChange={(e) => setMaterialForm((prev) => ({ ...prev, description: e.target.value }))}
               />

               <div className="md:col-span-3 flex gap-2">
                  <button
                     type="submit"
                     className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white inline-flex items-center gap-2"
                     disabled={isSubmitting}
                  >
                     {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
                     {isSubmitting ? 'Salvando...' : editingMaterialId ? 'Salvar edicao' : 'Adicionar material'}
                  </button>
                  {editingMaterialId && (
                     <button
                        type="button"
                        className="rounded-xl bg-mist px-4 py-2 text-sm font-semibold text-ink"
                        onClick={resetForm}
                     >
                        Cancelar
                     </button>
                  )}
               </div>
            </form>

            {(createMaterialMutation.isError || updateMaterialMutation.isError || deleteMaterialMutation.isError) && (
               <p className="mt-3 text-sm text-ember inline-flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {(createMaterialMutation.error instanceof Error && createMaterialMutation.error.message) ||
                     (updateMaterialMutation.error instanceof Error && updateMaterialMutation.error.message) ||
                     (deleteMaterialMutation.error instanceof Error && deleteMaterialMutation.error.message) ||
                     'Falha ao processar operacao de material.'}
               </p>
            )}

            <div className="mt-4 overflow-x-auto rounded-xl border border-mist">
               <table className="min-w-full text-sm">
                  <thead>
                     <tr className="border-b border-mist text-left text-steel">
                        <th className="px-3 py-2">SKU</th>
                        <th className="px-3 py-2">Material</th>
                        <th className="px-3 py-2">Categoria</th>
                        <th className="px-3 py-2">Unidade</th>
                        <th className="px-3 py-2">Min</th>
                        <th className="px-3 py-2">Custo</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Acoes</th>
                     </tr>
                  </thead>
                  <tbody>
                     {materialsQuery.isLoading && (
                        <tr>
                           <td className="px-3 py-4 text-steel" colSpan={8}><span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando materiais...</span></td>
                        </tr>
                     )}
                     {!materialsQuery.isLoading && !materials.length && (
                        <tr>
                           <td className="px-3 py-4 text-steel" colSpan={8}>Nenhum material encontrado.</td>
                        </tr>
                     )}
                     {materials.map((material) => (
                        <tr key={material.id} className="border-b border-mist/70">
                           <td className="px-3 py-3 font-semibold">{material.sku}</td>
                           <td className="px-3 py-3">{material.name}</td>
                           <td className="px-3 py-3">{material.category.name}</td>
                           <td className="px-3 py-3">{material.unit}</td>
                           <td className="px-3 py-3">{material.minStock}</td>
                           <td className="px-3 py-3">R$ {Number(material.costPrice).toFixed(2)}</td>
                           <td className="px-3 py-3">
                              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${material.isActive ? 'bg-mint/20 text-mint' : 'bg-ember/20 text-ember'}`}>
                                 {material.isActive ? 'Ativo' : 'Inativo'}
                              </span>
                           </td>
                           <td className="px-3 py-3">
                              <div className="flex gap-2">
                                 <button
                                    className="rounded-lg bg-ink px-3 py-1 text-xs font-semibold text-white"
                                    type="button"
                                    onClick={() => startEdit(material)}
                                 >
                                    <span className="inline-flex items-center gap-1"><Pencil className="h-3 w-3" /> Editar</span>
                                 </button>
                                 <button
                                    className="rounded-lg bg-ember px-3 py-1 text-xs font-semibold text-white"
                                    type="button"
                                    onClick={() => deleteMaterialMutation.mutate(material.id)}
                                    disabled={deleteMaterialMutation.isPending || !material.isActive}
                                 >
                                    <span className="inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Excluir</span>
                                 </button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </article>
      </section>
   );
}
