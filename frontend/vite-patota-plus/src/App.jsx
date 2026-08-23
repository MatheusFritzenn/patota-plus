import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login/index.jsx'
import Cadastro from './pages/Cadastro/index.jsx'
import RecuperarSenha from './pages/RecuperarSenha/index.jsx'
import RedefinirSenha from './pages/RedefinirSenha/index.jsx'
import Home from './pages/Home/index.jsx'
import LayoutAutenticado from './components/LayoutAutenticado.jsx'

function App() {
  return (
    <Routes>
      {/* Rotas públicas (sem header) */}
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/recuperar-senha" element={<RecuperarSenha />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />

      {/* Rotas autenticadas (com header) */}
      <Route element={<LayoutAutenticado />}>
        <Route path="/home" element={<Home />} />
      </Route>

      <Route path="/" element={<Navigate to="/home" />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )
}

export default App
