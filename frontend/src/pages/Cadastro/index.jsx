import { IndicadorCarregamento } from '../../components/Carregamento.jsx'
import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, Goal, LockKeyhole, UserRound } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import supabase from '../../services/supabaseClient.js'
import api from '../../services/api.js'
import RequisitosSenha from '../../components/RequisitosSenha.jsx'
import { senhaAtendeRequisitos, mensagemSenhaInvalida } from '../../utils/validacaoSenha.js'
import './style.css'

// Modalidades hardcodadas (IDs devem corresponder ao banco)
const arrayModalidades = [
  { id: 1, nome: 'Futebol de campo' },
  { id: 2, nome: 'Futebol society' },
  { id: 3, nome: 'Futebol de salão' }
]

// Posições por modalidade (IDs devem corresponder ao banco)
const posicoesPorModalidade = {
  1: [
    { id: 1, nome: 'Goleiro' },
    { id: 2, nome: 'Zagueiro' },
    { id: 3, nome: 'Lateral' },
    { id: 4, nome: 'Volante' },
    { id: 5, nome: 'Meia' },
    { id: 6, nome: 'Atacante' }
  ],
  2: [
    { id: 1, nome: 'Goleiro' },
    { id: 7, nome: 'Fixo' },
    { id: 8, nome: 'Ala' },
    { id: 9, nome: 'Pivô' }
  ],
  3: [
    { id: 1, nome: 'Goleiro' },
    { id: 7, nome: 'Fixo' },
    { id: 8, nome: 'Ala' },
    { id: 9, nome: 'Pivô' }
  ]
}

function Cadastro() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [telefone, setTelefone] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [arrayModalidadesSelecionadas, setModalidadesSelecionadas] = useState([])
  const [arrayPosicoesSelecionadas, setPosicoesSelecionadas] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmaSenha, setMostrarConfirmaSenha] = useState(false)

  const navigate = useNavigate()

  // Retorna as posições disponíveis com base nas modalidades selecionadas
  function obterPosicoesDisponiveis() {
    const arrayPosicoes = []
    const arrayIdsJaAdicionados = []

    for (const modalidadeId of arrayModalidadesSelecionadas) {
      const arrayPosicoesDaModalidade = posicoesPorModalidade[modalidadeId]
      if (arrayPosicoesDaModalidade) {
        for (const posicao of arrayPosicoesDaModalidade) {
          if (!arrayIdsJaAdicionados.includes(posicao.id)) {
            arrayIdsJaAdicionados.push(posicao.id)
            arrayPosicoes.push(posicao)
          }
        }
      }
    }

    return arrayPosicoes
  }

  function handleModalidadeChange(modalidadeId) {
    let arrayNovasModalidades = []

    if (arrayModalidadesSelecionadas.includes(modalidadeId)) {
      // Remove a modalidade
      for (const id of arrayModalidadesSelecionadas) {
        if (id !== modalidadeId) {
          arrayNovasModalidades.push(id)
        }
      }
    } else {
      // Adiciona a modalidade
      for (const id of arrayModalidadesSelecionadas) {
        arrayNovasModalidades.push(id)
      }
      arrayNovasModalidades.push(modalidadeId)
    }

    setModalidadesSelecionadas(arrayNovasModalidades)

    // Remove posições que não pertencem mais a nenhuma modalidade selecionada
    const arrayIdsPosicoesValidas = []
    for (const modId of arrayNovasModalidades) {
      const arrayPosicoesDaModalidade = posicoesPorModalidade[modId]
      if (arrayPosicoesDaModalidade) {
        for (const posicao of arrayPosicoesDaModalidade) {
          if (!arrayIdsPosicoesValidas.includes(posicao.id)) {
            arrayIdsPosicoesValidas.push(posicao.id)
          }
        }
      }
    }

    const arrayPosicoesAtualizadas = []
    for (const posId of arrayPosicoesSelecionadas) {
      if (arrayIdsPosicoesValidas.includes(posId)) {
        arrayPosicoesAtualizadas.push(posId)
      }
    }
    setPosicoesSelecionadas(arrayPosicoesAtualizadas)
  }

  function handlePosicaoChange(posicaoId) {
    let arrayNovasPosicoes = []

    if (arrayPosicoesSelecionadas.includes(posicaoId)) {
      for (const id of arrayPosicoesSelecionadas) {
        if (id !== posicaoId) {
          arrayNovasPosicoes.push(id)
        }
      }
    } else {
      for (const id of arrayPosicoesSelecionadas) {
        arrayNovasPosicoes.push(id)
      }
      arrayNovasPosicoes.push(posicaoId)
    }

    setPosicoesSelecionadas(arrayNovasPosicoes)
  }

  function formatarTelefone(valor) {
    // Remove tudo que não é número
    let numeros = valor.replace(/\D/g, '')

    // Limita a 11 dígitos
    if (numeros.length > 11) {
      numeros = numeros.substring(0, 11)
    }

    // Aplica a máscara conforme a quantidade de dígitos
    let resultado = ''

    if (numeros.length > 0) {
      resultado = '(' + numeros.substring(0, 2)
    }
    if (numeros.length > 2) {
      resultado = resultado + ') ' + numeros.substring(2, 7)
    }
    if (numeros.length > 7) {
      resultado = resultado + '-' + numeros.substring(7, 11)
    }

    return resultado
  }

  function handleTelefoneChange(e) {
    const valorFormatado = formatarTelefone(e.target.value)
    setTelefone(valorFormatado)
  }

  async function handleCadastro(evento) {
    evento.preventDefault()
    setErro('')

    // Validações
    if (!senhaAtendeRequisitos(senha)) {
      setErro(mensagemSenhaInvalida)
      return
    }

    if (senha !== confirmaSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    if (arrayModalidadesSelecionadas.length === 0) {
      setErro('Selecione ao menos uma modalidade.')
      return
    }

    if (arrayPosicoesSelecionadas.length === 0) {
      setErro('Selecione ao menos uma posição.')
      return
    }

    // Verifica se cada modalidade selecionada tem ao menos uma posição marcada
    for (const modalidadeId of arrayModalidadesSelecionadas) {
      const arrayPosicoesDaModalidade = posicoesPorModalidade[modalidadeId]
      let temPosicao = false

      if (arrayPosicoesDaModalidade) {
        for (const posicao of arrayPosicoesDaModalidade) {
          if (arrayPosicoesSelecionadas.includes(posicao.id)) {
            temPosicao = true
            break
          }
        }
      }

      if (!temPosicao) {
        let nomeModalidade = ''
        for (const mod of arrayModalidades) {
          if (mod.id === modalidadeId) {
            nomeModalidade = mod.nome
            break
          }
        }
        setErro('Selecione ao menos uma posição para a modalidade ' + nomeModalidade + '.')
        return
      }
    }

    setCarregando(true)

    // Passo 1: Criar usuário no Supabase Auth
    const { error } = await supabase.auth.signUp({
      email: email,
      password: senha
    })

    if (error) {
      setErro('Erro ao criar conta: ' + error.message)
      setCarregando(false)
      return
    }

    // Passo 2: Salvar perfil no backend usando a sessão criada pelo Supabase
    try {
      const dadosUsuario = {
        nome: nome,
        telefone: telefone,
        dataNascimento: dataNascimento,
        modalidades: arrayModalidadesSelecionadas,
        posicoes: arrayPosicoesSelecionadas
      }

      await api.post('/usuarios', dadosUsuario)

      setCarregando(false)
      navigate('/login')
    } 
    catch (erroBackend) {
      console.error('Erro ao salvar perfil:', erroBackend)
      setErro('Conta criada, mas houve um erro ao salvar o perfil. Tente fazer login.')
      setCarregando(false)
    }
  }

  const arrayPosicoesDisponiveis = obterPosicoesDisponiveis()

  return (
    <div className="cadastro-page min-h-screen bg-[#f4f7f5] px-3 py-6 sm:px-6 sm:py-7 text-[#172d20]">
      <div className="mx-auto mb-5 flex max-w-[780px] items-center justify-between gap-4">
        <Link to="/login" className="text-[25px] font-bold tracking-[-1px] text-green-700">Patota+</Link>
        <span className="hidden text-xs text-[#65736a] sm:block">Seu próximo jogo começa aqui.</span>
      </div>
      <main className="mx-auto max-w-[780px] overflow-hidden rounded-[22px] border border-[#dce5df] bg-white">
        <header className="border-b border-[#dce5df] px-[22px] py-6 sm:px-9 sm:pt-[30px]">
          <p className="mb-2.5 text-[11px] uppercase tracking-[1.8px] text-green-700">Vem para a patota</p>
          <h1 className="mb-2.5 text-[26px] font-semibold leading-tight tracking-[-0.8px] sm:text-[28px]">Crie sua conta e entre em campo.</h1>
          <p className="text-sm leading-relaxed text-[#65736a]">Conte um pouco sobre você e o futebol que gosta de jogar.</p>
        </header>

        <form onSubmit={handleCadastro} aria-busy={carregando} className="px-[22px] pb-6 sm:px-9">
          <section className="border-b border-[#dce5df] py-6" aria-labelledby="cadastro-dados">
            <h2 id="cadastro-dados" className="mb-5 flex items-center gap-2.5 text-[15px] font-semibold"><UserRound size={18} className="text-green-700" aria-hidden="true" />Seus dados</h2>
            <div className="grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="nome" className="cadastro-label">Nome completo</label>
                <input id="nome" type="text" autoComplete="name" placeholder="Seu nome completo" value={nome} onChange={(e) => setNome(e.target.value)} required className="cadastro-input" />
              </div>
              <div className="min-w-0">
                <label htmlFor="email" className="cadastro-label">E-mail</label>
                <input id="email" type="email" autoComplete="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="cadastro-input" />
              </div>
              <div className="min-w-0">
                <label htmlFor="telefone" className="cadastro-label">Telefone (com DDD)</label>
                <input id="telefone" type="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={telefone} onChange={handleTelefoneChange} required className="cadastro-input" />
              </div>
              <div className="min-w-0">
                <label htmlFor="dataNascimento" className="cadastro-label">Data de nascimento</label>
                <input id="dataNascimento" type="date" autoComplete="bday" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} required className="cadastro-input" />
              </div>
            </div>
          </section>

          <section className="border-b border-[#dce5df] py-6" aria-labelledby="cadastro-senha">
            <h2 id="cadastro-senha" className="mb-5 flex items-center gap-2.5 text-[15px] font-semibold"><LockKeyhole size={18} className="text-green-700" aria-hidden="true" />Sua senha</h2>
            <div className="grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="senha" className="cadastro-label">Senha</label>
                <div className="relative">
                  <input id="senha" type={mostrarSenha ? 'text' : 'password'} autoComplete="new-password" placeholder="Crie uma senha forte" value={senha} onChange={(e) => setSenha(e.target.value)} required aria-describedby="cadastro-requisitos" className="cadastro-input cadastro-input-senha" />
                  <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={mostrarSenha} aria-controls="senha" className="cadastro-eye">
                    {mostrarSenha ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <div className="min-w-0">
                <label htmlFor="confirmaSenha" className="cadastro-label">Confirme a senha</label>
                <div className="relative">
                  <input id="confirmaSenha" type={mostrarConfirmaSenha ? 'text' : 'password'} autoComplete="new-password" placeholder="Repita sua senha" value={confirmaSenha} onChange={(e) => setConfirmaSenha(e.target.value)} required className="cadastro-input cadastro-input-senha" />
                  <button type="button" onClick={() => setMostrarConfirmaSenha(!mostrarConfirmaSenha)} aria-label={mostrarConfirmaSenha ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'} aria-pressed={mostrarConfirmaSenha} aria-controls="confirmaSenha" className="cadastro-eye">
                    {mostrarConfirmaSenha ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </div>
            <div id="cadastro-requisitos" className="cadastro-requisitos"><RequisitosSenha senha={senha} /></div>
          </section>

          <section className="border-b border-[#dce5df] py-6" aria-labelledby="cadastro-futebol">
            <h2 id="cadastro-futebol" className="mb-5 flex items-center gap-2.5 text-[15px] font-semibold"><Goal size={18} className="text-green-700" aria-hidden="true" />Seu futebol</h2>
            <fieldset className="min-w-0" aria-describedby="cadastro-modalidades-ajuda">
              <legend className="cadastro-label">O que você joga?</legend>
              <p id="cadastro-modalidades-ajuda" className="mb-3 text-xs leading-relaxed text-[#65736a]">Selecione uma ou mais modalidades.</p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {arrayModalidades.map((modalidade) => (
                  <label key={modalidade.id} className="cadastro-option min-h-[52px] px-3 py-4">
                    <input type="checkbox" checked={arrayModalidadesSelecionadas.includes(modalidade.id)} onChange={() => handleModalidadeChange(modalidade.id)} />
                    <span>{modalidade.nome}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-5 min-w-0" aria-describedby="cadastro-posicoes-ajuda">
              <legend className="cadastro-label">Em quais posições você joga?</legend>
              <p id="cadastro-posicoes-ajuda" className="mb-3 text-xs leading-relaxed text-[#65736a]" aria-live="polite">
                {arrayPosicoesDisponiveis.length > 0 ? 'Escolha ao menos uma posição para cada modalidade selecionada.' : 'Selecione uma modalidade para ver as posições disponíveis.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {arrayPosicoesDisponiveis.map((posicao) => (
                  <label key={posicao.id} className="cadastro-option min-h-11 px-3 py-2.5">
                    <input type="checkbox" checked={arrayPosicoesSelecionadas.includes(posicao.id)} onChange={() => handlePosicaoChange(posicao.id)} />
                    <span>{posicao.nome}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          {erro && <p role="alert" className="mt-4 text-sm text-red-700">{erro}</p>}
          <div className="flex flex-col-reverse items-stretch gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
            <p className="text-center text-[13px] text-[#65736a]">Já tem conta?{' '}<Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-green-700 hover:underline">Faça login</Link></p>
            <button type="submit" disabled={carregando} aria-busy={carregando} className="flex min-h-12 items-center justify-center gap-3 rounded-xl bg-green-700 px-6 text-sm font-semibold text-white transition-colors hover:bg-green-800 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
              {carregando ? <IndicadorCarregamento texto="Cadastrando..." /> : 'Criar minha conta'}
              {!carregando && <ArrowRight size={18} aria-hidden="true" />}
            </button>
          </div>
        </form>
      </main>
      <p className="mt-5 text-center text-[11px] text-[#65736a]">Patota+ · Futebol entre amigos, organização de verdade.</p>
    </div>
  )
}

export default Cadastro
