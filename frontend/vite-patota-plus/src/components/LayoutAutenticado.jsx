import { Outlet } from 'react-router-dom'
import Header from './Header.jsx'

function LayoutAutenticado() {
  return (
    <div className="min-h-screen bg-green-50">
      <Header />
      <Outlet />
    </div>
  )
}

export default LayoutAutenticado
