import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/layouts/auth-layout";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { GuardedRoute } from "@/components/common/require-permission";
import { useAuth } from "@/hooks/use-auth";

const LoginPage = lazy(() => import("@/pages/auth/login-page"));
const DashboardPage = lazy(() => import("@/pages/dashboard/dashboard-page"));
const CustomersPage = lazy(() => import("@/pages/customers/customers-page"));
const VehiclesPage = lazy(() => import("@/pages/vehicles/vehicles-page"));
const WashJobsPage = lazy(() => import("@/pages/wash-jobs/wash-jobs-page"));
const BookingsPage = lazy(() => import("@/pages/bookings/bookings-page"));
const ServicesPage = lazy(() => import("@/pages/services/services-page"));
const EmployeesPage = lazy(() => import("@/pages/employees/employees-page"));
const InventoryPage = lazy(() => import("@/pages/inventory/inventory-page"));
const ExpensesPage = lazy(() => import("@/pages/expenses/expenses-page"));
const ReportsPage = lazy(() => import("@/pages/reports/reports-page"));
const AnalyticsPage = lazy(() => import("@/pages/analytics/analytics-page"));
const ReceiptsPage = lazy(() => import("@/pages/receipts/receipts-page"));
const NotificationsPage = lazy(() => import("@/pages/notifications/notifications-page"));
const SettingsPage = lazy(() => import("@/pages/settings/settings-page"));
const AuditLogsPage = lazy(() => import("@/pages/audit-logs/audit-logs-page"));
const ProfilePage = lazy(() => import("@/pages/profile/profile-page"));
const HelpPage = lazy(() => import("@/pages/help/help-page"));
const RolesPage = lazy(() => import("@/pages/roles/roles-page"));
const NotFoundPage = lazy(() => import("@/pages/not-found-page"));
const ForbiddenPage = lazy(() => import("@/pages/forbidden-page"));
const ServerErrorPage = lazy(() => import("@/pages/server-error-page"));
const SessionExpiredPage = lazy(() => import("@/pages/session-expired-page"));

/** Guards authenticated shell routes. */
function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <RouteLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <DashboardLayout />;
}

/** Sends already-authenticated users away from auth pages. */
function PublicOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <RouteLoader />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RouteLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <Loader2 className="size-7 animate-spin text-primary" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        {/* Auth */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <LoginPage />
              </PublicOnly>
            }
          />
        </Route>

        {/* App */}
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<GuardedRoute><DashboardPage /></GuardedRoute>} />
          <Route path="/wash-jobs" element={<GuardedRoute><WashJobsPage /></GuardedRoute>} />
          <Route path="/bookings" element={<GuardedRoute><BookingsPage /></GuardedRoute>} />
          <Route path="/customers" element={<GuardedRoute><CustomersPage /></GuardedRoute>} />
          <Route path="/vehicles" element={<GuardedRoute><VehiclesPage /></GuardedRoute>} />
          <Route path="/services" element={<GuardedRoute><ServicesPage /></GuardedRoute>} />
          <Route path="/employees" element={<GuardedRoute><EmployeesPage /></GuardedRoute>} />
          <Route path="/inventory" element={<GuardedRoute><InventoryPage /></GuardedRoute>} />
          <Route path="/expenses" element={<GuardedRoute><ExpensesPage /></GuardedRoute>} />
          <Route path="/reports" element={<GuardedRoute><ReportsPage /></GuardedRoute>} />
          <Route path="/analytics" element={<GuardedRoute><AnalyticsPage /></GuardedRoute>} />
          <Route path="/receipts" element={<GuardedRoute><ReceiptsPage /></GuardedRoute>} />
          <Route path="/notifications" element={<GuardedRoute><NotificationsPage /></GuardedRoute>} />
          <Route path="/settings" element={<GuardedRoute><SettingsPage /></GuardedRoute>} />
          <Route path="/audit-logs" element={<GuardedRoute><AuditLogsPage /></GuardedRoute>} />
          <Route path="/profile" element={<GuardedRoute><ProfilePage /></GuardedRoute>} />
          <Route path="/help" element={<GuardedRoute><HelpPage /></GuardedRoute>} />
          <Route path="/roles" element={<GuardedRoute><RolesPage /></GuardedRoute>} />
        </Route>

        {/* Error pages */}
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/500" element={<ServerErrorPage />} />
        <Route path="/session-expired" element={<SessionExpiredPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
