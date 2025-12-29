import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
// Admin pages
import Dashboard from './pages/Dashboard'
import Rooms from './pages/Rooms'
import RoomWizard from './pages/RoomWizard'
import AddOns from './pages/AddOns'
import AddOnWizard from './pages/AddOnWizard'
import Bookings from './pages/Bookings'
import BookingWizard from './pages/BookingWizard'
import BookingDetail from './pages/BookingDetail'
import Settings from './pages/Settings'
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public website routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="accommodation" element={<Accommodation />} />
            <Route path="accommodation/:id" element={<RoomDetail />} />
            <Route path="contact" element={<Contact />} />
          </Route>

          {/* Public booking route (outside layout for full-screen experience) */}
          <Route path="/book" element={<Book />} />

          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/payment/callback" element={<PaymentCallback />} />

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
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
