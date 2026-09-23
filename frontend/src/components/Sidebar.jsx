import { CirclePlus, Search, UsersRound, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'

function classeLinkNavegacao({ isActive }) {
  let classe = 'flex min-h-12 items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold transition-colors hover:bg-green-50 hover:text-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600'

  if (isActive) {
    classe += ' bg-green-100 text-green-800 shadow-[inset_3px_0_0_#15803d]'
  } else {
    classe += ' text-gray-700'
  }

  return classe
}

function Sidebar({ aberto, aoFechar }) {
  let classeSidebar = 'fixed bottom-0 left-0 top-16 z-40 w-60 shrink-0 overflow-y-auto border-r border-green-100 bg-white px-4 py-5 shadow-xl md:static md:block md:w-56 md:overflow-visible md:shadow-none'

  if (aberto) {
    classeSidebar += ' block'
  } else {
    classeSidebar += ' hidden'
  }

  return (
    <>
      {aberto && (
        <button
          type="button"
          aria-label="Fechar menu de navegação"
          onClick={aoFechar}
          className="fixed inset-x-0 bottom-0 top-16 z-30 bg-black/40 cursor-pointer md:hidden"
        />
      )}

      <aside id="navegacao-lateral" aria-label="Navegação principal" className={classeSidebar}>
        <div className="md:sticky md:top-5">
          <div className="mb-3 flex items-center justify-between px-2">
            <p className="text-xs font-semibold tracking-widest text-gray-500">NAVEGAÇÃO</p>
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={aoFechar}
              className="rounded-lg p-2 text-gray-600 hover:bg-green-50 cursor-pointer md:hidden"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Páginas principais" className="flex flex-col gap-1">
            <NavLink to="/minhas-patotas" className={classeLinkNavegacao} onClick={aoFechar}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700" aria-hidden="true">
                <UsersRound size={19} />
              </span>
              Minhas patotas
            </NavLink>
            <NavLink to="/buscar-patotas" className={classeLinkNavegacao} onClick={aoFechar}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700" aria-hidden="true">
                <Search size={19} />
              </span>
              Buscar patotas
            </NavLink>
            <NavLink to="/criar-patota" className={classeLinkNavegacao} onClick={aoFechar}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700" aria-hidden="true">
                <CirclePlus size={19} />
              </span>
              Criar patota
            </NavLink>
          </nav>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
