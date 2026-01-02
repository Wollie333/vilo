import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'
import { AuthProvider } from './contexts/AuthContext'
import { CustomerAuthProvider } from './contexts/CustomerAuthContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import { CustomerWebSocketProvider } from './contexts/CustomerWebSocketContext'
import ProtectedRoute from './components/ProtectedRoute'
import CustomerProtectedRoute from './components/CustomerProtectedRoute'
// Admin pages
import Dashboard from './pages/Dashboard'
import Rooms from './pages/Rooms'
import RoomWizard from './pages/RoomWizard'
import AddOns from './pages/AddOns'
import AddOnWizard from './pages/AddOnWizard'
import Bookings from './pages/Bookings'
import BookingWizard from './pages/BookingWizard'
import BookingDetail from './pages/BookingDetail'
import Refunds from './pages/Refunds'
import RefundDetail from './pages/RefundDetail'
import Calendar from './pages/Calendar'
import Reviews from './pages/Reviews'
import Settings from './pages/Settings'
import BusinessDetails from './pages/business/BusinessDetails'
import BusinessDirectory from './pages/business/BusinessDirectory'
import PaymentIntegration from './pages/business/PaymentIntegration'
import IntegrationsSettings from './pages/settings/IntegrationsSettings'
import RolesSettings from './pages/settings/RolesSettings'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Support from './pages/Support'
import UnifiedAnalytics from './pages/UnifiedAnalytics'
import Layout from './components/Layout'
import Login from './pages/Login'
import Payment from './pages/Payment'
import PaymentCallback from './pages/PaymentCallback'
// Public pages
import Book from './pages/public/Book'
import LeaveReview from './pages/public/LeaveReview'
import JoinTeam from './pages/JoinTeam'
import SetupPassword from './pages/SetupPassword'
import Pricing from './pages/Pricing'
import HostSignup from './pages/HostSignup'
// Customer Portal pages
import CustomerLayout from './components/CustomerLayout'
import CustomerLogin from './pages/portal/CustomerLogin'
import CustomerVerify from './pages/portal/CustomerVerify'
import CustomerDashboard from './pages/portal/CustomerDashboard'
import CustomerBookings from './pages/portal/CustomerBookings'
import CustomerBookingDetail from './pages/portal/CustomerBookingDetail'
import CustomerRefunds from './pages/portal/CustomerRefunds'
import CustomerReviews from './pages/portal/CustomerReviews'
import CustomerSupport from './pages/portal/CustomerSupport'
import CustomerSupportThread from './pages/portal/CustomerSupportThread'
import CustomerProfile from './pages/portal/CustomerProfile'
import PortalBrowse from './pages/portal/PortalBrowse'
import PortalPropertyDetail from './pages/portal/PortalPropertyDetail'
import PortalCheckout from './pages/portal/PortalCheckout'
// Discovery pages
import DiscoveryLayout from './components/discovery/DiscoveryLayout'
import DiscoveryHome from './pages/discovery/DiscoveryHome'
import SearchResults from './pages/discovery/SearchResults'
import PropertyDetail from './pages/discovery/PropertyDetail'
import PropertyRedirect from './components/PropertyRedirect'
import DestinationPage from './pages/discovery/DestinationPage'
import CategoryPage from './pages/discovery/CategoryPage'
import ProvincePage from './pages/discovery/ProvincePage'
import Checkout from './pages/discovery/Checkout'
import BookingConfirmation from './pages/discovery/BookingConfirmation'
import LandingPage from './pages/landing/LandingPage'
// Legal pages
import EarningsDisclaimer from './pages/legal/EarningsDisclaimer'
import TermsAndConditions from './pages/legal/TermsAndConditions'
import PrivacyPolicy from './pages/legal/PrivacyPolicy'
// Super Admin pages
import { SuperAdminProvider } from './contexts/SuperAdminContext'
import { AdminProtectedRoute } from './components/admin/AdminProtectedRoute'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminLogin } from './pages/admin/AdminLogin'
import UnifiedDashboard from './pages/admin/UnifiedDashboard'
import { TenantList } from './pages/admin/TenantList'
import { TenantDetail } from './pages/admin/TenantDetail'
import { TenantEdit } from './pages/admin/TenantEdit'
import { AdminRoomWizard } from './pages/admin/AdminRoomWizard'
import AdminBookingWizard from './pages/admin/AdminBookingWizard'
import { SystemHealth } from './pages/admin/SystemHealth'
import { ErrorLogs } from './pages/admin/ErrorLogs'
import { BackupManager } from './pages/admin/BackupManager'
import { UserList } from './pages/admin/UserList'
import { BillingDashboard } from './pages/admin/BillingDashboard'
// UnifiedAnalyticsDashboard consolidated into UnifiedDashboard
import { FeatureFlags } from './pages/admin/FeatureFlags'
import { AnnouncementManager } from './pages/admin/AnnouncementManager'
import { ActivityLogs } from './pages/admin/ActivityLogs'
import { AdminSettings } from './pages/admin/AdminSettings'
// Revenue pages
import { RevenueOverview } from './pages/admin/RevenueOverview'
import { SubscriptionList } from './pages/admin/SubscriptionList'
import { PlanManagement } from './pages/admin/PlanManagement'
import { GracePeriods } from './pages/admin/GracePeriods'

function App() {
  return (
    <AuthProvider>
      <CustomerAuthProvider>
        <SuperAdminProvider>
          <WebSocketProvider>
            <CustomerWebSocketProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ScrollToTop />
                <Routes>
            {/* Discovery Platform (public) */}
            <Route path="/" element={<DiscoveryLayout />}>
              <Route index element={<DiscoveryHome />} />
              <Route path="search" element={<SearchResults />} />
              <Route path="accommodation/:slug" element={<PropertyDetail />} />
              {/* Legacy routes - redirect to new SEO-friendly URLs */}
              <Route path="property/:slug" element={<PropertyRedirect />} />
              <Route path="property/:slug/book" element={<PropertyRedirect />} />
              <Route path="destinations/:region" element={<DestinationPage />} />
              {/* Category and Province browse pages */}
              <Route path="categories/:slug" element={<CategoryPage />} />
              <Route path="provinces/:provinceSlug" element={<ProvincePage />} />
              {/* Legal pages */}
              <Route path="earnings-disclaimer" element={<EarningsDisclaimer />} />
              <Route path="terms" element={<TermsAndConditions />} />
              <Route path="privacy" element={<PrivacyPolicy />} />
            </Route>

            {/* Checkout flow (outside layout for full-screen experience) */}
            <Route path="/accommodation/:slug/book" element={<Checkout />} />
            <Route path="/booking/confirmed/:bookingId" element={<BookingConfirmation />} />

            {/* SaaS marketing page for property owners */}
            <Route path="/for-hosts" element={<LandingPage />} />

            {/* Public booking route (outside layout for full-screen experience) */}
            <Route path="/book" element={<Book />} />

            {/* Public review submission route */}
            <Route path="/review/:tenantId/:token" element={<LeaveReview />} />

            {/* Team invitation routes */}
            <Route path="/join" element={<JoinTeam />} />
            <Route path="/setup-password" element={<SetupPassword />} />

            {/* Pricing page (public) */}
            <Route path="/pricing" element={<Pricing />} />

            {/* Host signup wizard */}
            <Route path="/signup" element={<HostSignup />} />

            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/payment/callback" element={<PaymentCallback />} />

            {/* Customer Portal routes */}
            <Route path="/portal/login" element={<CustomerLogin />} />
            <Route path="/portal/verify" element={<CustomerVerify />} />
            <Route path="/portal" element={
              <CustomerProtectedRoute>
                <CustomerLayout />
              </CustomerProtectedRoute>
            }>
              <Route index element={<CustomerDashboard />} />
              <Route path="bookings" element={<CustomerBookings />} />
              <Route path="bookings/browse" element={<PortalBrowse />} />
              <Route path="bookings/browse/:slug" element={<PortalPropertyDetail />} />
              <Route path="bookings/checkout/:slug" element={<PortalCheckout />} />
              <Route path="bookings/:id" element={<CustomerBookingDetail />} />
              <Route path="refunds" element={<CustomerRefunds />} />
              <Route path="reviews" element={<CustomerReviews />} />
              <Route path="support" element={<CustomerSupport />} />
              <Route path="support/:id" element={<CustomerSupportThread />} />
              <Route path="profile" element={<CustomerProfile />} />
            </Route>

            {/* Super Admin Portal routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }>
              <Route index element={<UnifiedDashboard />} />
              <Route path="tenants" element={<TenantList />} />
              <Route path="tenants/:id" element={<TenantDetail />} />
              <Route path="tenants/:id/edit" element={<TenantEdit />} />
              <Route path="tenants/:tenantId/rooms/new" element={<AdminRoomWizard />} />
              <Route path="tenants/:tenantId/rooms/:roomId/edit" element={<AdminRoomWizard />} />
              <Route path="tenants/:tenantId/bookings/new" element={<AdminBookingWizard />} />
              <Route path="tenants/:tenantId/bookings/:bookingId/edit" element={<AdminBookingWizard />} />
              <Route path="users" element={<UserList />} />
              <Route path="billing" element={<BillingDashboard />} />
              {/* Revenue sub-pages */}
              <Route path="revenue" element={<RevenueOverview />} />
              <Route path="subscriptions" element={<SubscriptionList />} />
              <Route path="plans" element={<PlanManagement />} />
              <Route path="grace-periods" element={<GracePeriods />} />
              {/* Analytics now consolidated into main dashboard */}
              <Route path="analytics" element={<Navigate to="/admin" replace />} />
              <Route path="analytics/revenue" element={<Navigate to="/admin" replace />} />
              <Route path="analytics/customers" element={<Navigate to="/admin" replace />} />
              <Route path="analytics/growth" element={<Navigate to="/admin" replace />} />
              <Route path="analytics/usage" element={<Navigate to="/admin" replace />} />
              <Route path="analytics/reports" element={<Navigate to="/admin" replace />} />
              <Route path="features" element={<FeatureFlags />} />
              <Route path="announcements" element={<AnnouncementManager />} />
              <Route path="activity" element={<ActivityLogs />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="health" element={<SystemHealth />} />
              <Route path="errors" element={<ErrorLogs />} />
              <Route path="backups" element={<BackupManager />} />
            </Route>

            {/* Tenant dashboard routes (protected) */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="rooms" element={<Rooms />} />
              <Route path="rooms/new" element={<RoomWizard />} />
              <Route path="rooms/:id/edit" element={<RoomWizard />} />
              <Route path="addons" element={<AddOns />} />
              <Route path="addons/new" element={<AddOnWizard />} />
              <Route path="addons/:id/edit" element={<AddOnWizard />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="bookings/new" element={<BookingWizard />} />
              <Route path="bookings/:id" element={<BookingDetail />} />
              <Route path="bookings/:id/edit" element={<BookingWizard />} />
              <Route path="refunds" element={<Refunds />} />
              <Route path="refunds/:id" element={<RefundDetail />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:email" element={<CustomerDetail />} />
              <Route path="support" element={<Support />} />
              <Route path="analytics" element={<UnifiedAnalytics />} />
              <Route path="analytics/revenue" element={<Navigate to="/dashboard/analytics" replace />} />
              <Route path="analytics/bookings" element={<Navigate to="/dashboard/analytics" replace />} />
              <Route path="analytics/traffic" element={<Navigate to="/dashboard/analytics" replace />} />
              <Route path="analytics/reports" element={<Navigate to="/dashboard/analytics" replace />} />
              <Route path="settings" element={<Settings />} />
              <Route path="business" element={<Navigate to="/dashboard/business/details" replace />} />
              <Route path="business/details" element={<BusinessDetails />} />
              <Route path="business/directory" element={<BusinessDirectory />} />
              <Route path="business/payments" element={<PaymentIntegration />} />
              <Route path="settings/integrations" element={<IntegrationsSettings />} />
              <Route path="settings/roles" element={<RolesSettings />} />
            </Route>
                  </Routes>
                </BrowserRouter>
              </CustomerWebSocketProvider>
            </WebSocketProvider>
          </SuperAdminProvider>
        </CustomerAuthProvider>
      </AuthProvider>
  )
}

export default App
