import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../../services/supabaseClient.js'
import api from '../../services/api.js'

// Modalidades hardcodadas
const arrayModalidades = [
  { id: 1, nome: 'Futebol de campo' },
  { id: 2, nome: 'Futebol society' },
  { id: 3, nome: 'Futebol de salão' }
]

// Posições por modalidade
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

function Perfil() {
  const [usuario, setUsuario] = useState(null)
  const [editando, setEditando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  // Campos editáveis
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [modalidadesSelecionadas, setModalidadesSelecionadas] = useState([])
  const [posicoesSelecionadas, setPosicoesSelecionadas] = useState([])
  const [fotoUrl, setFotoUrl] = useState(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)

  const [userId, setUserId] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    carregarPerfil()
  }, [])

  async function carregarPerfil() {
    const { data } = await supabase.auth.getUser()

    if (!data || !data.user) {
      navigate('/login')
      return
    }

    setUserId(data.user.id)

    try {
      const resposta = await api.get('/usuarios/' + data.user.id)
      const dadosUsuario = resposta.data

      setUsuario(dadosUsuario)
      setNome(dadosUsuario.nome || '')
      setTelefone(dadosUsuario.telefone || '')
      setFotoUrl(dadosUsuario.foto || null)

      // Formatar data para input type="date"
      if (dadosUsuario.dataNascimento) {
        const dataObj = new Date(dadosUsuario.dataNascimento)
        const ano = dataObj.getFullYear()
        const mes = String(dataObj.getMonth() + 1).padStart(2, '0')
        const dia = String(dataObj.getDate()).padStart(2, '0')
        setDataNascimento(ano + '-' + mes + '-' + dia)
      }

      // Extrair IDs das modalidades
      const arrayIdsModalidades = []
      if (dadosUsuario.modalidades) {
        for (const item of dadosUsuario.modalidades) {
          arrayIdsModalidades.push(item.modalidade.id)
        }
      }
      setModalidadesSelecionadas(arrayIdsModalidades)

      // Extrair IDs das posições
      const arrayIdsPosicoes = []
      if (dadosUsuario.posicoes) {
        for (const item of dadosUsuario.posicoes) {
          arrayIdsPosicoes.push(item.posicao.id)
        }
      }
      setPosicoesSelecionadas(arrayIdsPosicoes)

      setCarregando(false)
    } 
    catch (erroRequisicao) {
      console.error('Erro ao carregar perfil:', erroRequisicao)
      setErro('Erro ao carregar dados do perfil.')
      setCarregando(false)
    }
  }

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
      for (const id of modalidadesSelecionadas) {
        if (id !== modalidadeId) {
          arrayNovasModalidades.push(id)
        }
      }
    } else {
      for (const id of modalidadesSelecionadas) {
        arrayNovasModalidades.push(id)
      }
      arrayNovasModalidades.push(modalidadeId)
    }

    setModalidadesSelecionadas(arrayNovasModalidades)

    // Remove posições inválidas
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

  async function handleUploadFoto(evento) {
    const arquivo = evento.target.files[0]
    if (!arquivo) return

    setUploadingFoto(true)

    const nomeArquivo = userId + '-' + Date.now() + '.' + arquivo.name.split('.').pop()

    const { error } = await supabase.storage
      .from('avatars')
      .upload(nomeArquivo, arquivo, { upsert: true })

    if (error) {
      console.error('Erro no upload:', error)
      setErro('Erro ao enviar foto.')
      setUploadingFoto(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(nomeArquivo)

    const novaUrl = urlData.publicUrl
    setFotoUrl(novaUrl)

    // Salva a URL da foto no backend
    try {
      await api.put('/usuarios/' + userId, { foto: novaUrl })
    } 
    catch (erroSalvar) {
      console.error('Erro ao salvar URL da foto:', erroSalvar)
    }

    setUploadingFoto(false)
  }

  async function handleSalvar() {
    setErro('')
    setSucesso('')

    if (!nome.trim()) {
      setErro('O nome é obrigatório.')
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

    // Verifica se cada modalidade selecionada tem ao menos uma posição marcada
    for (const modalidadeId of modalidadesSelecionadas) {
      const posicoesDaModalidade = posicoesPorModalidade[modalidadeId]
      let temPosicao = false

      if (posicoesDaModalidade) {
        for (const posicao of posicoesDaModalidade) {
          if (posicoesSelecionadas.includes(posicao.id)) {
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

    setSalvando(true)

    try {
      const dadosAtualizar = {
        nome: nome,
        telefone: telefone,
        dataNascimento: dataNascimento,
        modalidades: modalidadesSelecionadas,
        posicoes: posicoesSelecionadas
      }

      const resposta = await api.put('/usuarios/' + userId, dadosAtualizar)
      setUsuario(resposta.data)
      setSucesso('Perfil atualizado com sucesso!')
      setEditando(false)
      setSalvando(false)
    } catch (erroSalvar) {
      console.error('Erro ao salvar perfil:', erroSalvar)
      setErro('Erro ao salvar alterações.')
      setSalvando(false)
    }
  }

  function handleCancelar() {
    // Restaura os valores originais
    setNome(usuario.nome || '')
    setTelefone(usuario.telefone || '')
    setFotoUrl(usuario.foto || null)

    if (usuario.dataNascimento) {
      const dataObj = new Date(usuario.dataNascimento)
      const ano = dataObj.getFullYear()
      const mes = String(dataObj.getMonth() + 1).padStart(2, '0')
      const dia = String(dataObj.getDate()).padStart(2, '0')
      setDataNascimento(ano + '-' + mes + '-' + dia)
    } else {
      setDataNascimento('')
    }

    const arrayIdsModalidades = []
    if (usuario.modalidades) {
      for (const item of usuario.modalidades) {
        arrayIdsModalidades.push(item.modalidade.id)
      }
    }
    setModalidadesSelecionadas(arrayIdsModalidades)

    const arrayIdsPosicoes = []
    if (usuario.posicoes) {
      for (const item of usuario.posicoes) {
        arrayIdsPosicoes.push(item.posicao.id)
      }
    }
    setPosicoesSelecionadas(arrayIdsPosicoes)

    setErro('')
    setSucesso('')
    setEditando(false)
  }

  function formatarTelefone(valor) {
    let numeros = valor.replace(/\D/g, '')
    if (numeros.length > 11) {
      numeros = numeros.substring(0, 11)
    }
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

  if (carregando) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-gray-500 text-center">Carregando...</p>
      </main>
    )
  }

  const arrayPosicoesDisponiveis = obterPosicoesDisponiveis()

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Header do perfil */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-green-700">Meu Perfil</h1>
          {!editando && (
            <button
              onClick={() => setEditando(true)}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Editar
            </button>
          )}
        </div>

        {/* Foto */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-green-200 mb-3">
            {fotoUrl ? (
              <img
                src={fotoUrl}
                alt="Foto do perfil"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-green-100 flex items-center justify-center">
                <span className="text-3xl text-green-600">U</span>
              </div>
            )}
          </div>
          {editando && (
            <label className="text-sm text-green-600 hover:underline cursor-pointer">
              {uploadingFoto ? 'Enviando...' : 'Alterar foto'}
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadFoto}
                className="hidden"
                disabled={uploadingFoto}
              />
            </label>
          )}

          {/* Média geral (avaliações) */}
          <div className="mt-4 w-full max-w-xs bg-green-50 border border-green-100 rounded-2xl px-6 py-4 text-center">
            <p className="text-sm text-gray-500 mb-1">Média geral</p>
            {usuario.totalAvaliacoes > 0 ? (
              <div>
                <p className="text-3xl font-bold text-green-700">
                  {Number(usuario.mediaGeral).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {usuario.totalAvaliacoes} avaliações recebidas
                </p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Sem avaliações ainda</p>
            )}
          </div>
        </div>

        {/* Campos */}
        <div className="flex flex-col gap-4">
          {/* Nome */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Nome completo</label>
            {editando ? (
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-800 px-4 py-2">{usuario.nome}</p>
            )}
          </div>

          {/* E-mail (não editável) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">E-mail</label>
            <p className="text-gray-500 px-4 py-2 bg-gray-50 rounded-lg">{usuario.email}</p>
          </div>

          {/* Telefone */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Telefone</label>
            {editando ? (
              <input
                type="tel"
                value={telefone}
                onChange={handleTelefoneChange}
                placeholder="(11) 99999-9999"
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-800 px-4 py-2">{usuario.telefone || 'Não informado'}</p>
            )}
          </div>

          {/* Data de nascimento */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Data de nascimento</label>
            {editando ? (
              <input
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className={`border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${dataNascimento ? 'text-gray-900' : 'text-gray-400'}`}
              />
            ) : (
              <p className="text-gray-800 px-4 py-2">
                {usuario.dataNascimento
                  ? new Date(usuario.dataNascimento).toLocaleDateString('pt-BR')
                  : 'Não informado'}
              </p>
            )}
          </div>

          {/* Modalidades */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Modalidades</label>
            {editando ? (
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
            ) : (
              <div className="flex flex-wrap gap-2 px-4 py-2">
                {usuario.modalidades && usuario.modalidades.map((item) => (
                  <span
                    key={item.modalidade.id}
                    className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full"
                  >
                    {item.modalidade.nome}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Posições */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Posições</label>
            {editando ? (
              arrayPosicoesDisponiveis.length > 0 ? (
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
              ) : (
                <p className="text-sm text-gray-400 px-4 py-2">Selecione uma modalidade primeiro</p>
              )
            ) : (
              <div className="flex flex-wrap gap-2 px-4 py-2">
                {usuario.posicoes && usuario.posicoes.map((item) => (
                  <span
                    key={item.posicao.id}
                    className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full"
                  >
                    {item.posicao.nome}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mensagens */}
        {erro && (
          <p className="text-red-500 text-sm text-center mt-4">{erro}</p>
        )}
        {sucesso && (
          <p className="text-green-600 text-sm text-center mt-4">{sucesso}</p>
        )}

        {/* Botões de edição */}
        {editando && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleCancelar}
              className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

export default Perfil
