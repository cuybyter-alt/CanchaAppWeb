import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Login from './pages/Login'
import Home from './pages/Home'
import AppLayout from './layouts/AppLayout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Home and layout routes - accessible to all */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/fields" element={<div className="p-8">Buscar Canchas - Próximamente</div>} />
          <Route path="/bookings" element={<div className="p-8">Mis Reservas - Próximamente</div>} />
          <Route path="/favorites" element={<div className="p-8">Favoritos - Próximamente</div>} />
          <Route path="/profile" element={<div className="p-8">Configuración - Próximamente</div>} />
          <Route path="/history" element={<div className="p-8">Historial - Próximamente</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
