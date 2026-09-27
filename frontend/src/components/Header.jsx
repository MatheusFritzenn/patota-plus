import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import supabase from '../services/supabaseClient.js'
import api from '../services/api.js'
import Avatar from './Avatar.jsx'
import { ChevronDown, LogOut, Menu, User, UserRound } from 'lucide-react'

function Header({ menuLateralAberto, aoAbrirMenuLateral, aoFecharMenuLateral }) {
  const [menuAberto, setMenuAberto] = useState(false)
  const [fotoUsuario, setFotoUsuario] = useState(null)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [emailUsuario, setEmailUsuario] = useState('')
  const menuRef = useRef(null)
  const botaoMenuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    buscarFotoUsuario()
  }, [])

  // Fecha o menu ao clicar fora
  useEffect(() => {
    function handleClickFora(evento) {
      if (menuRef.current && !menuRef.current.contains(evento.target)) {
        setMenuAberto(false)
      }
    }

    document.addEventListener('mousedown', handleClickFora)
    return () => {
      document.removeEventListener('mousedown', handleClickFora)
    }
  }, [])

  function fecharComEscape(evento) {
    if (evento.key === 'Escape' && menuAberto) {
      setMenuAberto(false)
      botaoMenuRef.current?.focus()
    }
  }

  function fecharAoSairDoMenu(evento) {
    if (!evento.currentTarget.contains(evento.relatedTarget)) {
      setMenuAberto(false)
    }
  }

  async function buscarFotoUsuario() {
    const { data } = await supabase.auth.getUser()
    if (data && data.user) {
      setEmailUsuario(data.user.email || '')
      try {
        const resposta = await api.get('/usuarios/me')
        if (resposta.data) {
          setFotoUsuario(resposta.data.foto || null)
          setNomeUsuario(resposta.data.nome || '')
        }
      } 
      catch (erro) {
        console.error('Erro ao buscar foto do usuário:', erro)
      }
    }
  }

  async function handleSair() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  let primeiroNome = 'Minha conta'
  if (nomeUsuario.trim()) {
    primeiroNome = nomeUsuario.trim().split(/\s+/)[0]
  }

  return (
    <header className="relative z-50 h-16 bg-[#14532d] px-3 text-white shadow-[0_2px_6px_#0a30151a] sm:px-6">
      <div className="flex h-full items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Abrir menu de navegação"
            aria-controls="navegacao-lateral"
            aria-expanded={menuLateralAberto}
            onClick={aoAbrirMenuLateral}
            className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer md:hidden"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <Link
            to="/minhas-patotas"
            onClick={aoFecharMenuLateral}
            className="flex min-h-11 items-center gap-2 rounded-lg text-[21px] font-bold tracking-[-0.6px] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:gap-2.5 sm:text-[23px]"
          >
            <img
              src="/favicon.png"
              alt=""
              aria-hidden="true"
              className="h-[29px] w-[29px] object-contain sm:h-[34px] sm:w-[34px]"
            />
            <span>Patota<span className="text-green-300">+</span></span>
          </Link>
        </div>

        {/* Avatar e menu dropdown */}
        <div className="relative" ref={menuRef} onKeyDown={fecharComEscape} onBlur={fecharAoSairDoMenu}>
          <button
            type="button"
            ref={botaoMenuRef}
            aria-label="Menu da minha conta"
            aria-expanded={menuAberto}
            aria-controls="menu-conta"
            onClick={() => setMenuAberto(!menuAberto)}
            className="flex min-h-12 items-center gap-2 rounded-xl border border-transparent p-1 hover:border-white/10 hover:bg-white/10 aria-expanded:border-white/10 aria-expanded:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors cursor-pointer sm:gap-2.5 sm:px-2.5"
          >
            <Avatar
              foto={fotoUsuario}
              tamanho="md"
              corBorda="branca"
              fallback="icone"
              iconeFallback={<User />}
            />
            <span className="hidden max-w-36 truncate text-[13px] font-medium sm:block">{primeiroNome}</span>
            <ChevronDown size={16} aria-hidden="true" className={menuAberto ? 'rotate-180 text-green-200' : 'text-green-200'} />
          </button>

          {/* Menu dropdown */}
          {menuAberto && (
            <div id="menu-conta" className="absolute right-0 top-full z-50 mt-3 w-[264px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-[#dce5df] bg-white text-[#172d20] shadow-[0_12px_32px_#0b29141c]">
              <div className="border-b border-[#dce5df] p-5">
                <p className="mb-1 break-words text-sm font-semibold">{nomeUsuario || 'Minha conta'}</p>
                {emailUsuario && <p className="break-words text-xs text-[#65736a]">{emailUsuario}</p>}
              </div>
              <div className="p-[7px]">
              <Link
                to="/perfil"
                onClick={() => setMenuAberto(false)}
                className="flex min-h-[46px] items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] hover:bg-[#edf8f0] focus-visible:outline-2 focus-visible:outline-green-700 transition-colors"
              >
                <UserRound size={18} className="text-green-700" aria-hidden="true" />
                Meu perfil
              </Link>
              <hr className="mx-3 my-1 border-[#dce5df]" />
              <button
                type="button"
                onClick={handleSair}
                className="flex min-h-[46px] w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700 transition-colors cursor-pointer"
              >
                <LogOut size={18} aria-hidden="true" />
                Sair
              </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
