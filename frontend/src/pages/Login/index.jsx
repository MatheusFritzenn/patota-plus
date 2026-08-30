import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import supabase from '../../services/supabaseClient.js'
import './style.css'

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const navigate = useNavigate()

  async function handleLogin(evento) {
    evento.preventDefault()
    setErro('')
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: senha
    })

    if (error) {
      setErro('E-mail ou senha inválidos.')
      setCarregando(false)
      return
    }

    setCarregando(false)
    navigate('/home')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Título */}
        <h1 className="text-3xl font-bold text-green-700 text-center mb-2">
          Patota+
        </h1>
        <p className="text-gray-500 text-center mb-8">
          Entre na sua conta para continuar
        </p>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* Campo E-mail */}
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Campo Senha */}
          <div className="flex flex-col gap-1">
            <label htmlFor="senha" className="text-sm font-medium text-gray-700">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Mensagem de erro */}
          {erro && (
            <p className="text-red-500 text-sm text-center">{erro}</p>
          )}

          {/* Botão de login */}
          <button
            type="submit"
            disabled={carregando}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Links auxiliares */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <Link to="/recuperar-senha" className="text-green-600 hover:underline">
            Esqueceu sua senha?
          </Link>
        </div>

        <div className="mt-3 text-center text-sm text-gray-500">
          Não tem conta?{' '}
          <Link to="/cadastro" className="text-green-600 hover:underline font-medium">
            Cadastre-se
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Login
