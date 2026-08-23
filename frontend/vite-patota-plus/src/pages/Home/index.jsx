import { Link } from 'react-router-dom'
import './style.css'

function Home() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        O que deseja fazer?
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card - Minhas Patotas */}
        <Link
          to="/minhas-patotas"
          className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100"
        >
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚽</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Minhas Patotas</h3>
            <p className="text-sm text-gray-500">
              Veja as patotas das quais você participa
            </p>
          </div>
        </Link>

        {/* Card - Buscar Patotas */}
        <Link
          to="/buscar-patotas"
          className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100"
        >
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Buscar Patotas</h3>
            <p className="text-sm text-gray-500">
              Encontre novas patotas para participar
            </p>
          </div>
        </Link>

        {/* Card - Criar Patota */}
        <Link
          to="/criar-patota"
          className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100"
        >
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">➕</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Criar Patota</h3>
            <p className="text-sm text-gray-500">
              Crie sua própria patota e convide jogadores
            </p>
          </div>
        </Link>
      </div>
    </main>
  )
}

export default Home
