import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../../services/supabaseClient.js'
import './style.css'

function RedefinirSenha() {
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [carregando, setCarregando] = useState(false)

  const navigate = useNavigate()

  async function handleRedefinir(evento) {
    evento.preventDefault()
    setErro('')

    if (novaSenha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    if (novaSenha !== confirmaSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    setCarregando(true)

    const { error } = await supabase.auth.updateUser({
      password: novaSenha
    })

    if (error) {
      setErro('Erro ao redefinir a senha. Tente novamente.')
      setCarregando(false)
      return
    }

    setSucesso(true)
    setCarregando(false)

    // Redireciona para login após 3 segundos
    setTimeout(() => {
      navigate('/login')
    }, 3000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Título */}
        <h1 className="text-3xl font-bold text-green-700 text-center mb-2">
          Redefinir senha
        </h1>
        <p className="text-gray-500 text-center mb-8">
          Digite sua nova senha
        </p>

        {/* Formulário */}
        {!sucesso && (
          <form onSubmit={handleRedefinir} className="flex flex-col gap-4">
            {/* Nova senha */}
            <div className="flex flex-col gap-1">
              <label htmlFor="novaSenha" className="text-sm font-medium text-gray-700">
                Nova senha
              </label>
              <input
                id="novaSenha"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                required
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Confirmação */}
            <div className="flex flex-col gap-1">
              <label htmlFor="confirmaSenha" className="text-sm font-medium text-gray-700">
                Confirme a nova senha
              </label>
              <input
                id="confirmaSenha"
                type="password"
                placeholder="Digite a senha novamente"
                value={confirmaSenha}
                onChange={(e) => setConfirmaSenha(e.target.value)}
                required
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Mensagem de erro */}
            {erro && (
              <p className="text-red-500 text-sm text-center">{erro}</p>
            )}

            {/* Botão redefinir */}
            <button
              type="submit"
              disabled={carregando}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {carregando ? 'Redefinindo...' : 'Redefinir senha'}
            </button>
          </form>
        )}

        {/* Mensagem de sucesso */}
        {sucesso && (
          <div className="text-center">
            <p className="text-green-600 font-medium mb-2">
              Senha redefinida com sucesso!
            </p>
            <p className="text-gray-500 text-sm">
              Redirecionando para o login...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default RedefinirSenha
