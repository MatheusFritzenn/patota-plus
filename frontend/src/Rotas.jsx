import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login/index.jsx'
import Cadastro from './pages/Cadastro/index.jsx'
import RecuperarSenha from './pages/RecuperarSenha/index.jsx'
import RedefinirSenha from './pages/RedefinirSenha/index.jsx'
import CriarPatota from './pages/CriarPatota/index.jsx'
import CriarPartida from './pages/CriarPartida/index.jsx'
import DetalhesPartida from './pages/DetalhesPartida/index.jsx'
import MinhasPatotas from './pages/MinhasPatotas/index.jsx'
import BuscarPatotas from './pages/BuscarPatotas/index.jsx'
import Perfil from './pages/Perfil/index.jsx'
import Patota from './pages/Patota/index.jsx'
import LayoutAutenticado from './components/LayoutAutenticado.jsx'

function Rotas() {
    return (
    <Routes>
      {/* Rotas públicas (sem header) */}
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/recuperar-senha" element={<RecuperarSenha />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />

      {/* Rotas autenticadas (com header) */}
      <Route element={<LayoutAutenticado />}>
        <Route path="/home" element={<Navigate to="/minhas-patotas" replace />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/criar-patota" element={<CriarPatota />} />
        <Route path="/patota/:id/editar" element={<CriarPatota />} />
        <Route path="/minhas-patotas" element={<MinhasPatotas />} />
        <Route path="/buscar-patotas" element={<BuscarPatotas />} />
        <Route path="/patota/:id" element={<Patota />} />
        <Route path="/patota/:id/criar-partida" element={<CriarPartida />} />
        <Route path="/partida/:partidaId/editar" element={<CriarPartida />} />
        <Route path="/partida/:id" element={<DetalhesPartida />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
    )
}

export default Rotas
