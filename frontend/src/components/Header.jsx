import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import supabase from '../services/supabaseClient.js'
import api from '../services/api.js'
import Avatar from './Avatar.jsx'
import { User } from 'lucide-react';

function Header() {
  const [menuAberto, setMenuAberto] = useState(false)
  const [fotoUsuario, setFotoUsuario] = useState(null)
  const menuRef = useRef(null)
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

  async function buscarFotoUsuario() {
    const { data } = await supabase.auth.getUser()
    if (data && data.user) {
      try {
        const resposta = await api.get('/usuarios/' + data.user.id)
        if (resposta.data && resposta.data.foto) {
          setFotoUsuario(resposta.data.foto)
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

  return (
    <header className="bg-green-700 text-white py-4 px-6 shadow-md">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link
          to="/home"
          className="flex items-center gap-2 text-xl font-bold hover:opacity-90"
        >
          <img
            src="/favicon.png"
            alt=""
            aria-hidden="true"
            className="h-9 w-9 object-contain"
          />
          <span>Patota+</span>
        </Link>

        {/* Avatar e menu dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="rounded-full cursor-pointer hover:opacity-90 transition-opacity"
          >
            <Avatar
              foto={fotoUsuario}
              tamanho="md"
              corBorda="branca"
              fallback="icone"
              iconeFallback={<User />}
            />
          </button>

          {/* Menu dropdown */}
          {menuAberto && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
              <Link
                to="/perfil"
                onClick={() => setMenuAberto(false)}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 transition-colors"
              >
                Meu perfil
              </Link>
              <hr className="my-1 border-gray-100" />
              <button
                onClick={handleSair}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
