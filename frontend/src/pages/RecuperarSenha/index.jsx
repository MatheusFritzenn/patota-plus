import { useState } from 'react'
import { Link } from 'react-router-dom'
import supabase from '../../services/supabaseClient.js'
import './style.css'

function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function handleRecuperar(evento) {
    evento.preventDefault()
    setErro('')
    setSucesso(false)
    setCarregando(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/redefinir-senha'
    })

    if (error) {
      setErro('Erro ao enviar o link. Verifique o e-mail informado.')
      setCarregando(false)
      return
    }

    setSucesso(true)
    setCarregando(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Título */}
        <h1 className="text-3xl font-bold text-green-700 text-center mb-2">
          Recuperar senha
        </h1>
        <p className="text-gray-500 text-center mb-8">
          Informe seu e-mail para receber o link de redefinição
        </p>

        {/* Formulário */}
        {!sucesso && (
          <form onSubmit={handleRecuperar} className="flex flex-col gap-4">
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

            {/* Mensagem de erro */}
            {erro && (
              <p className="text-red-500 text-sm text-center">{erro}</p>
            )}

            {/* Botão enviar */}
            <button
              type="submit"
              disabled={carregando}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {carregando ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>
        )}

        {/* Mensagem de sucesso */}
        {sucesso && (
          <div className="text-center">
            <p className="text-green-600 font-medium mb-4">
              Link enviado com sucesso! Verifique sua caixa de entrada.
            </p>
          </div>
        )}

        {/* Link para voltar ao login */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <Link to="/login" className="text-green-600 hover:underline">
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RecuperarSenha
