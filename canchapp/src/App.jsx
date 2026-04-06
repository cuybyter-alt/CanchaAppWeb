import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import './App.css'
import Login from './pages/Login'
import Home from './pages/Home'
import AppLayout from './layouts/AppLayout'
import Register from './pages/Register'
import Bookings from './pages/Bookings'
import Favorites from './pages/Favorites'
import Fields from './pages/Fields'
import ComplexDetail from './pages/ComplexDetail'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Payments from './pages/Payments'

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

        {/* Home and layout routes - accessible to all */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/fields" element={<Fields />} />
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
