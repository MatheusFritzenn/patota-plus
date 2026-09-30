import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import supabase from '../services/supabaseClient.js'
import Header from './Header.jsx'
import Sidebar from './Sidebar.jsx'

function LayoutAutenticado() {
  const [menuLateralAberto, setMenuLateralAberto] = useState(false)
  const [sessao, setSessao] = useState(null)
  const [verificandoSessao, setVerificandoSessao] = useState(true)

  useEffect(() => {
    // INITIAL_SESSION informa a sessão restaurada antes de liberar as telas.
    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao)
      setVerificandoSessao(false)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  function fecharMenuLateral() {
    setMenuLateralAberto(false)
  }

  useEffect(() => {
    if (!menuLateralAberto) return

    function fecharComEscape(evento) {
      if (evento.key === 'Escape') {
        setMenuLateralAberto(false)
      }
    }

    document.addEventListener('keydown', fecharComEscape)
    return () => document.removeEventListener('keydown', fecharComEscape)
  }, [menuLateralAberto])

  if (verificandoSessao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <p role="status" className="text-green-800">Carregando...</p>
      </div>
    )
  }

  if (!sessao) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-green-50">
      <Header
        menuLateralAberto={menuLateralAberto}
        aoAbrirMenuLateral={() => setMenuLateralAberto(true)}
        aoFecharMenuLateral={fecharMenuLateral}
      />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <Sidebar aberto={menuLateralAberto} aoFechar={fecharMenuLateral} />
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default LayoutAutenticado
