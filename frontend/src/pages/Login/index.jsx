import { IndicadorCarregamento } from '../../components/Carregamento.jsx'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import supabase from '../../services/supabaseClient.js'
import './style.css'

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

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
    navigate('/minhas-patotas')
  }

  return (
    <div className="login-page min-h-screen flex flex-col items-center justify-center bg-[#f4f7f5] px-3 py-6 sm:p-9 text-[#172d20]">
      <main className="login-shell w-full overflow-hidden rounded-[22px] border border-[#dce5df] bg-white">
        <section className="login-story flex-col bg-[#14532d] p-[38px] text-white" aria-label="Patota+, organização do futebol amador">
          <p className="text-[26px] font-bold tracking-[-1px]">Patota<span className="text-green-300">+</span></p>
          <p className="mt-12 mb-3.5 text-[11px] uppercase tracking-[2px] text-[#bbdfc7]">O jogo começa aqui</p>
          <h2 className="login-headline mb-5 font-semibold tracking-[-1.5px]">Sua turma.<br />Seu futebol.<br />Sua patota.</h2>
          <p className="max-w-[300px] text-sm leading-7 text-[#d2e7d9]">Reúna os amigos, organize as partidas e deixe tudo pronto para entrar em campo.</p>
          <div className="login-pitch" aria-hidden="true">
            <div className="login-pitch-area login-pitch-area-left" />
            <div className="login-pitch-area login-pitch-area-right" />
            <span className="login-player login-player-one" />
            <span className="login-player login-player-two" />
            <span className="login-player login-player-three" />
            <span className="login-player login-player-four" />
            <span className="login-player login-player-five" />
          </div>
          <p className="mt-auto text-xs tracking-wide text-[#bbdfc7]">Futsal · Society · Futebol de campo</p>
        </section>

        <section className="login-form-panel min-w-0 flex flex-col justify-center px-6 py-8" aria-labelledby="login-title">
          <p className="login-mobile-brand mb-7 text-[26px] font-bold tracking-[-1px] text-green-700">Patota+</p>
          <h1 id="login-title" className="mb-2 text-[27px] font-semibold tracking-[-0.8px] leading-tight">Bom ter você de volta!</h1>
          <p className="mb-[30px] text-sm leading-relaxed text-[#65736a]">Entre na sua conta e acompanhe os próximos jogos da sua patota.</p>

          {/* Formulário */}
          <form onSubmit={handleLogin} className="flex flex-col gap-5" aria-busy={carregando}>
            {/* Campo E-mail */}
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-[13px] font-medium">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 w-full border border-[#dce5df] rounded-xl px-3.5 text-base placeholder:text-[#65736a] focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>

            {/* Campo Senha */}
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <label htmlFor="senha" className="text-[13px] font-medium">
                Senha
              </label>
              <Link to="/recuperar-senha" className="login-recovery inline-flex items-center text-xs text-green-700 hover:underline">Esqueceu sua senha?</Link>
              </div>
              <div className="relative">
              <input
                id="senha"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="h-12 w-full border border-[#dce5df] rounded-xl pl-3.5 pr-14 text-base placeholder:text-[#65736a] focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
              <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={mostrarSenha} aria-controls="senha" className="absolute right-1 top-0.5 flex h-11 w-11 items-center justify-center rounded-lg text-[#65736a] hover:text-green-700 cursor-pointer">
                {mostrarSenha ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
              </div>
            </div>

            {/* Mensagem de erro */}
            {erro && (
              <p role="alert" className="text-red-700 text-sm">{erro}</p>
            )}

            {/* Botão de login */}
            <button
              type="submit"
              disabled={carregando} aria-busy={carregando}
              className="mt-1 flex h-12 w-full items-center justify-center gap-3 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {carregando ? <IndicadorCarregamento texto="Entrando..." /> : 'Entrar'}
              {!carregando && <ArrowRight size={18} aria-hidden="true" />}
            </button>
          </form>

          {/* Links auxiliares */}
          <div className="mt-7 border-t border-[#dce5df] pt-6 text-center text-[13px] text-[#65736a]">
            Ainda não tem conta?{' '}
            <Link to="/cadastro" className="inline-flex min-h-11 items-center text-green-700 hover:underline font-semibold">
              Cadastre-se
            </Link>
          </div>
        </section>
      </main>
      <p className="mt-[22px] text-center text-[11px] text-[#65736a]">Patota+ · Futebol entre amigos, organização de verdade.</p>
    </div>
  )
}

export default Login
