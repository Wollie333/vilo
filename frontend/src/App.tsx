import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'
import { AuthProvider } from './contexts/AuthContext'
import { CustomerAuthProvider } from './contexts/CustomerAuthContext'
import { TenantProvider } from './contexts/TenantContext'
import ProtectedRoute from './components/ProtectedRoute'
import CustomerProtectedRoute from './components/CustomerProtectedRoute'
import MainSiteRoute from './components/MainSiteRoute'
// Admin pages
import Dashboard from './pages/Dashboard'
import Rooms from './pages/Rooms'
import RoomWizard from './pages/RoomWizard'
import AddOns from './pages/AddOns'
import AddOnWizard from './pages/AddOnWizard'
import Bookings from './pages/Bookings'
import BookingWizard from './pages/BookingWizard'
import BookingDetail from './pages/BookingDetail'
import Calendar from './pages/Calendar'
import Reviews from './pages/Reviews'
import Settings from './pages/Settings'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Support from './pages/Support'
// Website CMS pages
import WebsiteSettings from './pages/website/WebsiteSettings'
import PageSettings from './pages/website/PageSettings'
import BlogManager from './pages/website/BlogManager'
import BlogEditor from './pages/website/BlogEditor'
import SiteKit from './pages/website/SiteKit'
import MenuSettings from './pages/website/MenuSettings'
import PageBuilder from './pages/website/PageBuilder'
import MediaManager from './pages/website/MediaManager'
import SEODashboard from './pages/website/SEODashboard'
import Layout from './components/Layout'
import Login from './pages/Login'
import Payment from './pages/Payment'
import PaymentCallback from './pages/PaymentCallback'
// Public pages
import PublicLayout from './components/PublicLayout'
import Home from './pages/public/Home'
import Accommodation from './pages/public/Accommodation'
import RoomDetail from './pages/public/RoomDetail'
import Contact from './pages/public/Contact'
import Book from './pages/public/Book'
import LeaveReview from './pages/public/LeaveReview'
import PublicReviews from './pages/public/Reviews'
import PublicBlog from './pages/public/Blog'
import Directory from './pages/public/Directory'
import JoinTeam from './pages/JoinTeam'
import Pricing from './pages/Pricing'
// Customer Portal pages
import CustomerLayout from './components/CustomerLayout'
import CustomerLogin from './pages/portal/CustomerLogin'
import CustomerVerify from './pages/portal/CustomerVerify'
// CustomerDashboard is available but currently routes to bookings
// import CustomerDashboard from './pages/portal/CustomerDashboard'
import CustomerBookings from './pages/portal/CustomerBookings'
import CustomerBookingDetail from './pages/portal/CustomerBookingDetail'
import CustomerReviews from './pages/portal/CustomerReviews'
import CustomerSupport from './pages/portal/CustomerSupport'
import CustomerSupportThread from './pages/portal/CustomerSupportThread'
import CustomerProfile from './pages/portal/CustomerProfile'

function App() {
  return (
    <AuthProvider>
      <CustomerAuthProvider>
        <TenantProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollToTop />
            <Routes>
              {/* Public routes - MainSiteRoute shows landing on vilo.io, tenant site on subdomains */}
              <Route element={<MainSiteRoute />}>
                <Route element={<PublicLayout />}>
                  <Route index element={<Home />} />
                  <Route path="accommodation" element={<Accommodation />} />
                  <Route path="accommodation/:id" element={<RoomDetail />} />
                  <Route path="reviews" element={<PublicReviews />} />
                  <Route path="blog" element={<PublicBlog />} />
                  <Route path="blog/:slug" element={<PublicBlog />} />
                  <Route path="contact" element={<Contact />} />
                </Route>
              </Route>

            {/* Public booking route (outside layout for full-screen experience) */}
            <Route path="/book" element={<Book />} />

            {/* Public review submission route */}
            <Route path="/review/:tenantId/:token" element={<LeaveReview />} />

            {/* Team invitation route */}
            <Route path="/join" element={<JoinTeam />} />

            {/* Pricing page (public) */}
            <Route path="/pricing" element={<Pricing />} />

            {/* Directory page (public) - lists all properties */}
            <Route path="/directory" element={<Directory />} />

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
              <Route index element={<Navigate to="/portal/bookings" replace />} />
              <Route path="bookings" element={<CustomerBookings />} />
              <Route path="bookings/:id" element={<CustomerBookingDetail />} />
              <Route path="reviews" element={<CustomerReviews />} />
              <Route path="support" element={<CustomerSupport />} />
              <Route path="support/:id" element={<CustomerSupportThread />} />
              <Route path="profile" element={<CustomerProfile />} />
            </Route>

            {/* Admin dashboard routes (protected) */}
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
              <Route path="calendar" element={<Calendar />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:email" element={<CustomerDetail />} />
              <Route path="support" element={<Support />} />
              <Route path="settings" element={<Settings />} />
              {/* Website CMS routes */}
              <Route path="website" element={<WebsiteSettings />} />
              <Route path="website/site-kit" element={<SiteKit />} />
              <Route path="website/menus" element={<MenuSettings />} />
              <Route path="website/pages/:pageType" element={<PageSettings />} />
              <Route path="website/builder/:pageType" element={<PageBuilder />} />
              <Route path="website/blog" element={<BlogManager />} />
              <Route path="website/blog/new" element={<BlogEditor />} />
              <Route path="website/blog/:id/edit" element={<BlogEditor />} />
              <Route path="website/media" element={<MediaManager />} />
              <Route path="website/seo" element={<SEODashboard />} />
            </Route>
            </Routes>
          </BrowserRouter>
        </TenantProvider>
      </CustomerAuthProvider>
    </AuthProvider>
  )
}

export default App
