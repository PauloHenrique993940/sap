import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout';
import { DashboardPage } from '../features/dashboard/dashboard-page';
import { InventoryPage } from '../features/inventory/inventory-page';
import { RequestsPage } from '../features/requests/requests-page';
import { TraceabilityPage } from '../features/traceability/traceability-page';

export function AppRouter() {
   return (
      <Routes>
         <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/traceability" element={<TraceabilityPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
         </Route>
      </Routes>
   );
}
