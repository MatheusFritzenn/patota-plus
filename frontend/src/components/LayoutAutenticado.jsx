import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header.jsx'
import Sidebar from './Sidebar.jsx'

function LayoutAutenticado() {
  const [menuLateralAberto, setMenuLateralAberto] = useState(false)

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
