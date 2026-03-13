import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import './App.css'
import Login from './pages/Login'
import Home from './pages/Home'
import AppLayout from './layouts/AppLayout'
import Register from './pages/Register'
import Bookings from './pages/Bookings'
import Favorites from './pages/Favorites'

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
          <Route path="/fields" element={<div className="p-8">Buscar Canchas - Próximamente</div>} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/profile" element={<div className="p-8">Configuración - Próximamente</div>} />
          <Route path="/history" element={<div className="p-8">Historial - Próximamente</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
