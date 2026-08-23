import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import supabase from '../../services/supabaseClient.js'
import api from '../../services/api.js'
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
  const [modalidadesSelecionadas, setModalidadesSelecionadas] = useState([])
  const [posicoesSelecionadas, setPosicoesSelecionadas] = useState([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const navigate = useNavigate()

  // Retorna as posições disponíveis com base nas modalidades selecionadas
  function obterPosicoesDisponiveis() {
    const arrayPosicoes = []
    const idsJaAdicionados = []

    for (const modalidadeId of modalidadesSelecionadas) {
      const posicoesDaModalidade = posicoesPorModalidade[modalidadeId]
      if (posicoesDaModalidade) {
        for (const posicao of posicoesDaModalidade) {
          if (!idsJaAdicionados.includes(posicao.id)) {
            idsJaAdicionados.push(posicao.id)
            arrayPosicoes.push(posicao)
          }
        }
      }
    }

    return arrayPosicoes
  }

  function handleModalidadeChange(modalidadeId) {
    let arrayNovasModalidades = []

    if (modalidadesSelecionadas.includes(modalidadeId)) {
      // Remove a modalidade
      for (const id of modalidadesSelecionadas) {
        if (id !== modalidadeId) {
          arrayNovasModalidades.push(id)
        }
      }
    } else {
      // Adiciona a modalidade
      for (const id of modalidadesSelecionadas) {
        arrayNovasModalidades.push(id)
      }
      arrayNovasModalidades.push(modalidadeId)
    }

    setModalidadesSelecionadas(arrayNovasModalidades)

    // Remove posições que não pertencem mais a nenhuma modalidade selecionada
    const idsPosicoesValidas = []
    for (const modId of arrayNovasModalidades) {
      const posicoesDaModalidade = posicoesPorModalidade[modId]
      if (posicoesDaModalidade) {
        for (const posicao of posicoesDaModalidade) {
          if (!idsPosicoesValidas.includes(posicao.id)) {
            idsPosicoesValidas.push(posicao.id)
          }
        }
      }
    }

    const arrayPosicoesAtualizadas = []
    for (const posId of posicoesSelecionadas) {
      if (idsPosicoesValidas.includes(posId)) {
        arrayPosicoesAtualizadas.push(posId)
      }
    }
    setPosicoesSelecionadas(arrayPosicoesAtualizadas)
  }

  function handlePosicaoChange(posicaoId) {
    let arrayNovasPosicoes = []

    if (posicoesSelecionadas.includes(posicaoId)) {
      for (const id of posicoesSelecionadas) {
        if (id !== posicaoId) {
          arrayNovasPosicoes.push(id)
        }
      }
    } else {
      for (const id of posicoesSelecionadas) {
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
    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    if (senha !== confirmaSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    if (modalidadesSelecionadas.length === 0) {
      setErro('Selecione ao menos uma modalidade.')
      return
    }

    if (posicoesSelecionadas.length === 0) {
      setErro('Selecione ao menos uma posição.')
      return
    }

    setCarregando(true)

    // Passo 1: Criar usuário no Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: senha
    })

    if (error) {
      setErro('Erro ao criar conta: ' + error.message)
      setCarregando(false)
      return
    }

    const userId = data.user.id

    // Passo 2: Salvar perfil no backend
    try {
      const dadosUsuario = {
        id: userId,
        nome: nome,
        email: email,
        telefone: telefone,
        dataNascimento: dataNascimento,
        modalidades: modalidadesSelecionadas,
        posicoes: posicoesSelecionadas
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
    <div className="min-h-screen flex items-center justify-center bg-green-50 py-8">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">
        {/* Título */}
        <h1 className="text-3xl font-bold text-green-700 text-center mb-2">
          Patota+
        </h1>
        <p className="text-gray-500 text-center mb-8">
          Crie sua conta e entre em campo
        </p>

        {/* Formulário */}
        <form onSubmit={handleCadastro} className="flex flex-col gap-4">
          {/* Nome completo */}
          <div className="flex flex-col gap-1">
            <label htmlFor="nome" className="text-sm font-medium text-gray-700">
              Nome completo
            </label>
            <input
              id="nome"
              type="text"
              placeholder="Seu nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* E-mail */}
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

          {/* Senha */}
          <div className="flex flex-col gap-1">
            <label htmlFor="senha" className="text-sm font-medium text-gray-700">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Confirmação de senha */}
          <div className="flex flex-col gap-1">
            <label htmlFor="confirmaSenha" className="text-sm font-medium text-gray-700">
              Confirme a senha
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

          {/* Telefone */}
          <div className="flex flex-col gap-1">
            <label htmlFor="telefone" className="text-sm font-medium text-gray-700">
              Telefone (com DDD)
            </label>
            <input
              id="telefone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={telefone}
              onChange={handleTelefoneChange}
              required
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Data de nascimento */}
          <div className="flex flex-col gap-1">
            <label htmlFor="dataNascimento" className="text-sm font-medium text-gray-700">
              Data de nascimento
            </label>
            <input
              id="dataNascimento"
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              required
              className={`border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${dataNascimento ? 'text-gray-900' : 'text-gray-400'}`}
            />
          </div>

          {/* Modalidades */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700">
              Modalidade(s)
            </span>
            <div className="flex flex-col gap-2">
              {arrayModalidades.map((modalidade) => (
                <label key={modalidade.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalidadesSelecionadas.includes(modalidade.id)}
                    onChange={() => handleModalidadeChange(modalidade.id)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">{modalidade.nome}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Posições (aparecem somente se ao menos uma modalidade foi selecionada) */}
          {arrayPosicoesDisponiveis.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-700">
                Posição(ões) de jogo
              </span>
              <div className="flex flex-wrap gap-3">
                {arrayPosicoesDisponiveis.map((posicao) => (
                  <label key={posicao.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={posicoesSelecionadas.includes(posicao.id)}
                      onChange={() => handlePosicaoChange(posicao.id)}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{posicao.nome}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Mensagem de erro */}
          {erro && (
            <p className="text-red-500 text-sm text-center">{erro}</p>
          )}

          {/* Botão de cadastro */}
          <button
            type="submit"
            disabled={carregando}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {carregando ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        {/* Link para login */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Já tem conta?{' '}
          <Link to="/login" className="text-green-600 hover:underline font-medium">
            Faça login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Cadastro
