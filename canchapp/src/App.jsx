import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import './App.css'
import Login from './pages/Login'
import Home from './pages/Home'
import AppLayout from './layouts/AppLayout'
import AdminLayout from './layouts/AdminLayout'
import RequireAdmin from './components/auth/RequireAdmin'
import Register from './pages/Register'
import Bookings from './pages/Bookings'
import Favorites from './pages/Favorites'
import Fields from './pages/Fields'
import Complexes from './pages/Complexes'
import ComplexDetail from './pages/ComplexDetail'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Payments from './pages/Payments'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminComplexes from './pages/admin/AdminComplexes'
import AdminFields from './pages/admin/AdminFields'
import AdminBookings from './pages/admin/AdminBookings'
import AdminReports from './pages/admin/AdminReports'

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          className: 'font-sans',
          style: {
            fontFamily: 'Nunito, sans-serif',
            borderRadius: '16px',
          },
        }}
      />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin routes — Owner & Manager only */}
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/complexes" element={<AdminComplexes />} />
            <Route path="/admin/fields" element={<AdminFields />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/reports" element={<AdminReports />} />
          </Route>
        </Route>

        {/* Player / public layout routes */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/fields" element={<Fields />} />
          <Route path="/complexes" element={<Complexes />} />
          <Route path="/complexes/:id" element={<ComplexDetail />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/history" element={<div className="p-8">Historial - Próximamente</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
