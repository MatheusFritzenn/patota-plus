import { Link } from 'react-router-dom'

function Header() {
  return (
    <header className="bg-green-700 text-white py-4 px-6 shadow-md">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link to="/home" className="text-xl font-bold hover:opacity-90">
          Patota+
        </Link>
        <nav className="flex items-center gap-4">
          <Link to="/perfil" className="text-sm hover:underline">
            Meu perfil
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default Header
