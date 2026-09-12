import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import supabase from '../../services/supabaseClient.js'
import api from '../../services/api.js'
import ModalConfirmacao from '../../components/ModalConfirmacao.jsx'
import ModalMensagem from '../../components/ModalMensagem.jsx'
import Avatar from '../../components/Avatar.jsx'
import { Trash2 } from 'lucide-react'

// Formata a data (timestamp) para o padrão dd/mm/aaaa
function formatarData(data) {
  if (!data) return ''
  const dataObj = new Date(data)
  const dia = String(dataObj.getUTCDate()).padStart(2, '0')
  const mes = String(dataObj.getUTCMonth() + 1).padStart(2, '0')
  const ano = dataObj.getUTCFullYear()
  return dia + '/' + mes + '/' + ano
}

function DetalhesPartida() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [partida, setPartida] = useState(null)
  const [arrayParticipantes, setArrayParticipantes] = useState([])
  const [arrayPosicoesDisponiveis, setArrayPosicoesDisponiveis] = useState([])
  const [vagasRestantes, setVagasRestantes] = useState(0)
  const [abaAtiva, setAbaAtiva] = useState('lista-jogadores')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [userId, setUserId] = useState(null)
  const [ehPresidente, setEhPresidente] = useState(false)
  const [estaConfirmado, setEstaConfirmado] = useState(false)
  const [participanteParaRemover, setParticipanteParaRemover] = useState(null)
  const [modalFinalizarAberto, setModalFinalizarAberto] = useState(false)
  const [modalMensagem, setModalMensagem] = useState({ aberto: false, titulo: '', mensagem: '' })

  useEffect(() => {
    carregarDados()
  }, [id])

  async function carregarDados() {
    const { data } = await supabase.auth.getUser()

    if (!data || !data.user) {
      setErro('Usuário não autenticado.')
      setCarregando(false)
      return
    }

    setUserId(data.user.id)

    try {
      // Detalhes da partida
      const respostaPartida = await api.get('/partidas/' + id)
      const dadosPartida = respostaPartida.data
      setPartida(dadosPartida)

      // Verifica se o usuário é presidente da patota dessa partida
      const respostaMembresia = await api.get('/patotas/' + dadosPartida.patotaId + '/verificar-membro')
      if (respostaMembresia.data.role === 'PRESIDENTE') {
        setEhPresidente(true)
      }

      // Participantes
      await carregarParticipantes(data.user.id)

      setCarregando(false)
    }
    catch (erroRequisicao) {
      console.error('Erro ao carregar partida:', erroRequisicao)
      setErro('Erro ao carregar dados da partida.')
      setCarregando(false)
    }
  }

  async function carregarParticipantes(idUsuario) {
    const resposta = await api.get('/partidas/' + id + '/participantes')
    const dados = resposta.data

    setArrayParticipantes(dados.participantes)
    const arrayPosicoesResposta = dados.posicoesDisponiveis || []
    setArrayPosicoesDisponiveis(arrayPosicoesResposta)
    setVagasRestantes(dados.vagasRestantes)

    // Verifica se o usuário atual já está confirmado
    let confirmado = false
    for (const participante of dados.participantes) {
      if (participante.id === idUsuario) {
        confirmado = true
      }
    }
    setEstaConfirmado(confirmado)
  }

  async function handleConfirmarPresenca() {
    setErro('')
    try {
      await api.post('/partidas/' + id + '/participar')
      await carregarParticipantes(userId)
    }
    catch (erroRequisicao) {
      console.error('Erro ao confirmar presença:', erroRequisicao)
      if (erroRequisicao.response && erroRequisicao.response.status === 409) {
        setModalMensagem({ aberto: true, titulo: 'Não foi possível confirmar', mensagem: erroRequisicao.response.data.erro })
        await carregarParticipantes(userId)
      } else {
        setModalMensagem({ aberto: true, titulo: 'Erro', mensagem: 'Erro ao confirmar presença. Tente novamente.' })
      }
    }
  }

  async function handleRecusarPresenca() {
    setErro('')
    try {
      await api.delete('/partidas/' + id + '/participar')
      await carregarParticipantes(userId)
    }
    catch (erroRequisicao) {
      console.error('Erro ao recusar presença:', erroRequisicao)
      setModalMensagem({ aberto: true, titulo: 'Erro', mensagem: 'Erro ao recusar presença. Tente novamente.' })
    }
  }

  async function handleFinalizarPartida() {
    try {
      await api.put('/partidas/' + id + '/finalizar')
      setModalFinalizarAberto(false)

      // Atualiza o status da partida localmente
      const partidaAtualizada = {}
      for (const chave in partida) {
        partidaAtualizada[chave] = partida[chave]
      }
      partidaAtualizada.status = 'FINALIZADA'
      setPartida(partidaAtualizada)
    }
    catch (erroRequisicao) {
      console.error('Erro ao finalizar partida:', erroRequisicao)
      setModalFinalizarAberto(false)
      if (erroRequisicao.response && erroRequisicao.response.data && erroRequisicao.response.data.erro) {
        setModalMensagem({ aberto: true, titulo: 'Não foi possível finalizar', mensagem: erroRequisicao.response.data.erro })
      } else {
        setModalMensagem({ aberto: true, titulo: 'Erro', mensagem: 'Erro ao finalizar partida. Tente novamente.' })
      }
    }
  }

  async function handleRemoverParticipante() {
    if (!participanteParaRemover) return

    try {
      await api.delete('/partidas/' + id + '/participantes/' + participanteParaRemover.id)
      setParticipanteParaRemover(null)
      await carregarParticipantes(userId)
    }
    catch (erroRequisicao) {
      console.error('Erro ao remover participante:', erroRequisicao)
      setParticipanteParaRemover(null)
      setModalMensagem({ aberto: true, titulo: 'Erro', mensagem: 'Erro ao remover jogador da partida.' })
    }
  }

  if (carregando) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-gray-500 text-center">Carregando...</p>
      </main>
    )
  }

  if (erro) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-red-500 text-center">{erro}</p>
      </main>
    )
  }

  const partidaFinalizada = partida.status === 'FINALIZADA'

  const arrayAbas = [
    { id: 'lista-jogadores', nome: 'Lista de jogadores' },
    { id: 'times', nome: 'Times' },
    { id: 'avaliacoes', nome: 'Avaliações' }
  ]

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      {/* Cabeçalho da partida */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/patota/' + partida.patotaId)}
          className="text-sm text-green-700 hover:underline cursor-pointer mb-2"
        >
          ← Voltar para a patota
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">{partida.patotaNome}</h1>
          {partidaFinalizada && (
            <span className="text-xs bg-gray-200 text-gray-600 font-medium px-2.5 py-1 rounded-full">
              Finalizada
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {formatarData(partida.data)} às {partida.horario} — {partida.local}
        </p>
      </div>

      {/* Abas */}
      <div className="flex border-b border-gray-200 mb-6">
        {arrayAbas.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`px-4 py-2 text-sm font-medium cursor-pointer transition-colors ${abaAtiva === aba.id ? 'text-green-700 border-b-2 border-green-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {aba.nome}
          </button>
        ))}
      </div>

      {/* Conteúdo das abas */}
      {abaAtiva === 'lista-jogadores' && (
        <AbaListaJogadores
          arrayParticipantes={arrayParticipantes}
          vagasRestantes={vagasRestantes}
          vagasTotal={partida.vagasTotal}
          partidaFinalizada={partidaFinalizada}
          estaConfirmado={estaConfirmado}
          ehPresidente={ehPresidente}
          userId={userId}
          onConfirmar={handleConfirmarPresenca}
          onRecusar={handleRecusarPresenca}
          onRemover={(participante) => setParticipanteParaRemover(participante)}
          onFinalizar={() => setModalFinalizarAberto(true)}
        />
      )}

      {abaAtiva === 'times' && (
        <AbaTimes
          partidaId={id}
          ehPresidente={ehPresidente}
          partidaFinalizada={partidaFinalizada}
          arrayParticipantes={arrayParticipantes}
          arrayPosicoesDisponiveis={arrayPosicoesDisponiveis}
          onAtualizarParticipantes={() => carregarParticipantes(userId)}
          onMensagem={(titulo, mensagem) => setModalMensagem({ aberto: true, titulo: titulo, mensagem: mensagem })}
        />
      )}

      {abaAtiva === 'avaliacoes' && (
        <AbaAvaliacoes
          partidaId={id}
          userId={userId}
          ehPresidente={ehPresidente}
          partidaFinalizada={partidaFinalizada}
          onMensagem={(titulo, mensagem) => setModalMensagem({ aberto: true, titulo: titulo, mensagem: mensagem })}
        />
      )}

      {/* Modal de confirmação de finalização da partida */}
      <ModalConfirmacao
        aberto={modalFinalizarAberto}
        titulo="Finalizar partida"
        mensagem="Ao finalizar, a lista atual de jogadores presentes será registrada e não poderá mais ser alterada. Deseja continuar?"
        textoBotaoConfirmar="Finalizar"
        corBotaoConfirmar="verde"
        onConfirmar={handleFinalizarPartida}
        onCancelar={() => setModalFinalizarAberto(false)}
      />

      {/* Modal de confirmação de remoção de participante */}
      <ModalConfirmacao
        aberto={!!participanteParaRemover}
        titulo="Remover jogador"
        mensagem={participanteParaRemover ? 'Tem certeza que deseja remover ' + participanteParaRemover.nome + ' da partida?' : ''}
        textoBotaoConfirmar="Remover"
        onConfirmar={handleRemoverParticipante}
        onCancelar={() => setParticipanteParaRemover(null)}
      />

      {/* Modal de mensagem */}
      <ModalMensagem
        aberto={modalMensagem.aberto}
        titulo={modalMensagem.titulo}
        mensagem={modalMensagem.mensagem}
        onFechar={() => setModalMensagem({ aberto: false, titulo: '', mensagem: '' })}
      />
    </main>
  )
}

// Aba 5.1 — Lista de jogadores
function AbaListaJogadores({ arrayParticipantes, vagasRestantes, vagasTotal, partidaFinalizada, estaConfirmado, ehPresidente, userId, onConfirmar, onRecusar, onRemover, onFinalizar }) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
      {/* Cabeçalho: vagas + ações de presença */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">Vagas</p>
          <p className="text-gray-800 font-medium">
            {arrayParticipantes.length}/{vagasTotal}
            {!partidaFinalizada && (
              <span className="text-sm text-gray-500 font-normal">
                {' '}— {vagasRestantes} restante(s)
              </span>
            )}
          </p>
        </div>

        {/* Ações (apenas se a partida não está finalizada) */}
        {!partidaFinalizada && (
          <div className="flex items-center gap-3">
            {/* Presidente pode finalizar a partida */}
            {ehPresidente && (
              <button
                onClick={onFinalizar}
                className="border border-gray-400 text-gray-600 hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Finalizar partida
              </button>
            )}

            {estaConfirmado ? (
              <button
                onClick={onRecusar}
                className="border border-red-500 text-red-500 hover:bg-red-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Recusar presença
              </button>
            ) : (
              <button
                onClick={onConfirmar}
                disabled={vagasRestantes <= 0}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {vagasRestantes <= 0 ? 'Sem vagas' : 'Confirmar presença'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lista de participantes */}
      {arrayParticipantes.length === 0 && (
        <p className="text-gray-500 text-center">
          {partidaFinalizada ? 'Nenhum jogador participou desta partida.' : 'Nenhum jogador confirmado ainda.'}
        </p>
      )}

      {arrayParticipantes.length > 0 && (
        <div className="flex flex-col gap-4">
          {arrayParticipantes.map((participante) => (
            <div key={participante.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              {/* Foto */}
              <Avatar nome={participante.nome} foto={participante.foto} tamanho="lg" corBorda="verde" />

              {/* Dados */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-gray-800 font-medium">{participante.nome}</p>
                  {participante.id === userId && (
                    <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">
                      Você
                    </span>
                  )}
                </div>
                {participante.posicaoTemporariaNome && (
                  <p className="text-sm text-green-700">
                    Posição nesta partida: {participante.posicaoTemporariaNome}
                  </p>
                )}
                {!participante.posicaoTemporariaNome && participante.posicoes.length > 0 && (
                  <p className="text-sm text-gray-500">{participante.posicoes.join(', ')}</p>
                )}
              </div>

              {/* Presidente pode remover jogador (se a partida não está finalizada) */}
              {ehPresidente && !partidaFinalizada && (
                <div>
                  <button
                    onClick={() => onRemover(participante)}
                    className="text-red-500 hover:text-red-700 cursor-pointer transition-colors"
                    title="Remover jogador"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Aba 5.2 — Times (geração automática equilibrada)
function AbaTimes({ partidaId, ehPresidente, partidaFinalizada, arrayParticipantes, arrayPosicoesDisponiveis, onAtualizarParticipantes, onMensagem }) {
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [arrayTimes, setArrayTimes] = useState([])
  const [gerando, setGerando] = useState(false)
  const [modalRegenerarAberto, setModalRegenerarAberto] = useState(false)
  const [modalDesfazerAberto, setModalDesfazerAberto] = useState(false)
  const [salvandoPosicaoId, setSalvandoPosicaoId] = useState(null)

  useEffect(() => {
    carregarTimes()
  }, [partidaId])

  async function carregarTimes() {
    setCarregando(true)
    setErro('')
    try {
      const resposta = await api.get('/partidas/' + partidaId + '/times')
      setArrayTimes(resposta.data.times)
      setCarregando(false)
    }
    catch (erroRequisicao) {
      console.error('Erro ao carregar times:', erroRequisicao)
      setErro('Erro ao carregar os times.')
      setCarregando(false)
    }
  }

  async function handleGerarTimes() {
    setGerando(true)
    setModalRegenerarAberto(false)
    try {
      const resposta = await api.post('/partidas/' + partidaId + '/times/gerar')
      setArrayTimes(resposta.data.times)
      setGerando(false)
    }
    catch (erroRequisicao) {
      console.error('Erro ao gerar times:', erroRequisicao)
      setGerando(false)
      if (erroRequisicao.response && erroRequisicao.response.data && erroRequisicao.response.data.erro) {
        onMensagem('Não foi possível gerar', erroRequisicao.response.data.erro)
      } else {
        onMensagem('Erro', 'Erro ao gerar os times. Tente novamente.')
      }
    }
  }

  // Decide se gera direto ou pede confirmação (quando já existem times formados)
  function handleClicarGerar() {
    if (arrayTimes.length > 0) {
      setModalRegenerarAberto(true)
    } else {
      handleGerarTimes()
    }
  }

  async function handleDesfazerTimes() {
    setModalDesfazerAberto(false)
    try {
      await api.delete('/partidas/' + partidaId + '/times')
      setArrayTimes([])
    }
    catch (erroRequisicao) {
      console.error('Erro ao desfazer times:', erroRequisicao)
      if (erroRequisicao.response && erroRequisicao.response.data && erroRequisicao.response.data.erro) {
        onMensagem('Não foi possível desfazer', erroRequisicao.response.data.erro)
      } else {
        onMensagem('Erro', 'Erro ao desfazer os times. Tente novamente.')
      }
    }
  }

  async function handleAlterarPosicao(participanteId, valor) {
    setSalvandoPosicaoId(participanteId)

    let posicaoId = null
    if (valor !== '') {
      posicaoId = Number(valor)
    }

    try {
      await api.put('/partidas/' + partidaId + '/participantes/' + participanteId + '/posicao-temporaria', {
        posicaoId: posicaoId
      })
      await onAtualizarParticipantes()
      await carregarTimes()
      setSalvandoPosicaoId(null)
    }
    catch (erroRequisicao) {
      console.error('Erro ao alterar posição temporária:', erroRequisicao)
      setSalvandoPosicaoId(null)
      if (erroRequisicao.response && erroRequisicao.response.data && erroRequisicao.response.data.erro) {
        onMensagem('Não foi possível remanejar', erroRequisicao.response.data.erro)
      }
      else {
        onMensagem('Erro', 'Erro ao alterar a posição do jogador. Tente novamente.')
      }
    }
  }

  if (carregando) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
        <p className="text-gray-500">Carregando times...</p>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
        <p className="text-red-500">{erro}</p>
      </div>
    )
  }

  const temTimes = arrayTimes.length > 0

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho / controles do presidente */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Formação de times</h3>
            <p className="text-sm text-gray-500">
              Os times são gerados automaticamente e equilibrados pela média (força) dos jogadores, distribuindo os goleiros entre os times.
            </p>
          </div>

          {ehPresidente && !partidaFinalizada && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleClicarGerar}
                disabled={gerando}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gerando ? 'Gerando...' : (temTimes ? 'Regenerar times' : 'Gerar times')}
              </button>
              {temTimes && (
                <button
                  onClick={() => setModalDesfazerAberto(true)}
                  className="border border-gray-400 text-gray-600 hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Desfazer
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {ehPresidente && !partidaFinalizada && arrayParticipantes.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Posições nesta partida</h3>
            <p className="text-sm text-gray-500">
              Selecione uma posição temporária antes de gerar ou regenerar os times. A opção padrão mantém as posições do perfil.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {arrayParticipantes.map((participante) => (
              <label key={participante.id} className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
                <span className="text-sm font-medium text-gray-800">{participante.nome}</span>
                <span className="text-xs text-gray-500">
                  Perfil: {participante.posicoes.length > 0 ? participante.posicoes.join(', ') : 'sem posição cadastrada'}
                </span>
                <select
                  value={participante.posicaoTemporariaId || ''}
                  onChange={(evento) => handleAlterarPosicao(participante.id, evento.target.value)}
                  disabled={salvandoPosicaoId !== null}
                  className="mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  <option value="">Usar posição do perfil</option>
                  {arrayPosicoesDisponiveis.map((posicao) => (
                    <option key={posicao.id} value={posicao.id}>{posicao.nome}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>

        </div>
      )}

      {/* Estado vazio */}
      {!temTimes && (
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
          <p className="text-gray-500 text-lg mb-2">Times não formados</p>
          <p className="text-gray-400 text-sm">
            {partidaFinalizada
              ? 'Esta partida foi finalizada sem formação de times.'
              : (ehPresidente
                ? 'Clique em "Gerar times" para montar dois times equilibrados com os jogadores confirmados.'
                : 'O presidente ainda não gerou os times desta partida.')}
          </p>
        </div>
      )}

      {/* Grade de times */}
      {temTimes && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {arrayTimes.map((time) => (
            <div key={time.id} className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-gray-800 font-semibold">{time.nome}</h4>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Força média</p>
                  <p className="text-sm font-bold text-green-700">
                    {time.mediaForca !== null && time.mediaForca !== undefined ? time.mediaForca.toFixed(2) : '—'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {time.jogadores.map((jogador) => (
                  <div key={jogador.id} className="flex items-center gap-3">
                    <Avatar nome={jogador.nome} foto={jogador.foto} tamanho="md" corBorda="verde" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-gray-800 font-medium truncate">{jogador.nome}</p>
                        {jogador.ehGoleiro && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 font-medium px-2 py-0.5 rounded-full shrink-0">
                            GOL
                          </span>
                        )}
                      </div>
                      {jogador.posicaoTemporariaNome && (
                        <p className="text-xs text-green-700 truncate">
                          {jogador.posicaoTemporariaNome} (nesta partida)
                        </p>
                      )}
                      {!jogador.posicaoTemporariaNome && jogador.posicoes.length > 0 && (
                        <p className="text-xs text-gray-500 truncate">{jogador.posicoes.join(', ')}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-700">
                        {jogador.forca !== null && jogador.forca !== undefined ? jogador.forca.toFixed(2) : '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: confirmar regeneração */}
      <ModalConfirmacao
        aberto={modalRegenerarAberto}
        titulo="Regenerar times"
        mensagem="Isso vai refazer a divisão atual dos times. Deseja continuar?"
        textoBotaoConfirmar="Regenerar"
        corBotaoConfirmar="verde"
        onConfirmar={handleGerarTimes}
        onCancelar={() => setModalRegenerarAberto(false)}
      />

      {/* Modal: confirmar desfazer */}
      <ModalConfirmacao
        aberto={modalDesfazerAberto}
        titulo="Desfazer times"
        mensagem="A formação atual dos times será removida. Deseja continuar?"
        textoBotaoConfirmar="Desfazer"
        onConfirmar={handleDesfazerTimes}
        onCancelar={() => setModalDesfazerAberto(false)}
      />
    </div>
  )
}

// Aba 5.3 — Avaliações
function AbaAvaliacoes({ partidaId, userId, ehPresidente, partidaFinalizada, onMensagem }) {
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [avaliacoesLiberadas, setAvaliacoesLiberadas] = useState(false)
  const [avaliacoesEncerradas, setAvaliacoesEncerradas] = useState(false)
  const [participou, setParticipou] = useState(false)
  const [arrayAvaliaveis, setArrayAvaliaveis] = useState([])
  const [mapaNotas, setMapaNotas] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [arrayResultado, setArrayResultado] = useState([])
  const [modalEncerrarAberto, setModalEncerrarAberto] = useState(false)
  const [encerrando, setEncerrando] = useState(false)

  useEffect(() => {
    carregarAvaliacoes()
  }, [partidaId, userId])

  async function carregarAvaliacoes() {
    if (!userId) return

    setCarregando(true)
    setErro('')
    try {
      const resposta = await api.get('/partidas/' + partidaId + '/avaliacoes')
      const dados = resposta.data

      setAvaliacoesLiberadas(dados.avaliacoesLiberadas)
      setAvaliacoesEncerradas(dados.avaliacoesEncerradas)
      setParticipou(dados.participou)
      setArrayAvaliaveis(dados.avaliaveis)

      // Preenche o mapa de notas com as notas já dadas (se houver)
      const notasIniciais = {}
      for (const avaliavel of dados.avaliaveis) {
        if (avaliavel.notaDada !== null && avaliavel.notaDada !== undefined) {
          notasIniciais[avaliavel.id] = String(avaliavel.notaDada)
        } else {
          notasIniciais[avaliavel.id] = ''
        }
      }
      setMapaNotas(notasIniciais)

      // Se encerradas, carrega o resultado (médias)
      if (dados.avaliacoesEncerradas) {
        const respostaResultado = await api.get('/partidas/' + partidaId + '/avaliacoes/resultado')
        setArrayResultado(respostaResultado.data.resultado)
      }

      setCarregando(false)
    }
    catch (erroRequisicao) {
      console.error('Erro ao carregar avaliações:', erroRequisicao)
      setErro('Erro ao carregar as avaliações.')
      setCarregando(false)
    }
  }

  function handleMudarNota(avaliadoId, valor) {
    const novoMapa = {}
    for (const chave in mapaNotas) {
      novoMapa[chave] = mapaNotas[chave]
    }
    novoMapa[avaliadoId] = valor
    setMapaNotas(novoMapa)
  }

  async function handleSalvarAvaliacoes() {
    // Monta a lista de avaliações preenchidas e valida no cliente
    const arrayAvaliacoes = []
    for (const avaliavel of arrayAvaliaveis) {
      const valor = mapaNotas[avaliavel.id]
      if (valor === '' || valor === undefined || valor === null) {
        continue
      }

      const nota = Number(valor)
      if (Number.isNaN(nota) || nota < 0 || nota > 10) {
        onMensagem('Nota inválida', 'A nota de ' + avaliavel.nome + ' deve ser um número entre 0 e 10.')
        return
      }

      const item = {}
      item.avaliadoId = avaliavel.id
      item.nota = nota
      arrayAvaliacoes.push(item)
    }

    if (arrayAvaliacoes.length === 0) {
      onMensagem('Nenhuma nota', 'Preencha ao menos uma nota antes de salvar.')
      return
    }

    setSalvando(true)
    try {
      await api.post('/partidas/' + partidaId + '/avaliacoes', {
        avaliacoes: arrayAvaliacoes
      })
      setSalvando(false)
      onMensagem('Avaliações salvas', 'Suas avaliações foram registradas com sucesso.')
      await carregarAvaliacoes()
    }
    catch (erroRequisicao) {
      console.error('Erro ao salvar avaliações:', erroRequisicao)
      setSalvando(false)
      if (erroRequisicao.response && erroRequisicao.response.data && erroRequisicao.response.data.erro) {
        onMensagem('Não foi possível salvar', erroRequisicao.response.data.erro)
      } else {
        onMensagem('Erro', 'Erro ao salvar avaliações. Tente novamente.')
      }
    }
  }

  async function handleEncerrarAvaliacoes() {
    setEncerrando(true)
    try {
      await api.put('/partidas/' + partidaId + '/avaliacoes/encerrar')
      setEncerrando(false)
      setModalEncerrarAberto(false)
      await carregarAvaliacoes()
    }
    catch (erroRequisicao) {
      console.error('Erro ao encerrar avaliações:', erroRequisicao)
      setEncerrando(false)
      setModalEncerrarAberto(false)
      if (erroRequisicao.response && erroRequisicao.response.data && erroRequisicao.response.data.erro) {
        onMensagem('Não foi possível encerrar', erroRequisicao.response.data.erro)
      } else {
        onMensagem('Erro', 'Erro ao encerrar avaliações. Tente novamente.')
      }
    }
  }

  if (carregando) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
        <p className="text-gray-500">Carregando avaliações...</p>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
        <p className="text-red-500">{erro}</p>
      </div>
    )
  }

  // Partida ainda não finalizada — avaliações não liberadas
  if (!partidaFinalizada || !avaliacoesLiberadas) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
        <p className="text-gray-500 text-lg mb-2">Avaliações indisponíveis</p>
        <p className="text-gray-400 text-sm">As avaliações serão liberadas quando o presidente finalizar a partida.</p>
      </div>
    )
  }

  // Avaliações encerradas — mostra o resultado (médias por jogador na partida)
  if (avaliacoesEncerradas) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Resultado das avaliações</h3>
          <span className="text-xs bg-gray-200 text-gray-600 font-medium px-2 py-0.5 rounded-full">Encerradas</span>
        </div>

        {arrayResultado.length === 0 ? (
          <p className="text-gray-500 text-center">Nenhum jogador avaliado nesta partida.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {arrayResultado.map((jogador) => (
              <div key={jogador.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <Avatar nome={jogador.nome} foto={jogador.foto} tamanho="lg" corBorda="verde" />
                <div className="flex-1">
                  <p className="text-gray-800 font-medium">{jogador.nome}</p>
                  <p className="text-sm text-gray-500">
                    {jogador.totalAvaliacoes} avaliações recebidas
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Média</p>
                  <p className="text-lg font-bold text-green-700">
                    {jogador.totalAvaliacoes > 0 ? jogador.mediaPartida.toFixed(2) : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Avaliações abertas
  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho com ação do presidente */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Avaliações abertas</h3>
            <p className="text-sm text-gray-500">Dê uma nota de 0 a 10 para cada companheiro (decimais são permitidos).</p>
          </div>

          {ehPresidente && (
            <button
              onClick={() => setModalEncerrarAberto(true)}
              className="border border-gray-400 text-gray-600 hover:bg-gray-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Encerrar avaliações
            </button>
          )}
        </div>
      </div>

      {/* Formulário de avaliação (somente para quem participou) */}
      {!participou ? (
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
          <p className="text-gray-500">
            {ehPresidente
              ? 'Você não participou desta partida, então não avalia jogadores. Como presidente, você pode encerrar as avaliações acima.'
              : 'Apenas quem participou da partida pode avaliar os companheiros.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          {arrayAvaliaveis.length === 0 ? (
            <p className="text-gray-500 text-center">Não há companheiros para avaliar nesta partida.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {arrayAvaliaveis.map((avaliavel) => (
                <div key={avaliavel.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <Avatar nome={avaliavel.nome} foto={avaliavel.foto} tamanho="lg" corBorda="verde" />
                  <div className="flex-1">
                    <p className="text-gray-800 font-medium">{avaliavel.nome}</p>
                    {avaliavel.posicoes.length > 0 && (
                      <p className="text-sm text-gray-500">{avaliavel.posicoes.join(', ')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={mapaNotas[avaliavel.id]}
                      onChange={(evento) => handleMudarNota(avaliavel.id, evento.target.value)}
                      placeholder="0-10"
                      className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-center text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSalvarAvaliacoes}
                  disabled={salvando}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {salvando ? 'Salvando...' : 'Salvar avaliações'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de confirmação de encerramento */}
      <ModalConfirmacao
        aberto={modalEncerrarAberto}
        titulo="Encerrar avaliações"
        mensagem="Ao encerrar, ninguém poderá mais avaliar e as médias dos jogadores serão calculadas. Deseja continuar?"
        textoBotaoConfirmar={encerrando ? 'Encerrando...' : 'Encerrar'}
        corBotaoConfirmar="verde"
        onConfirmar={handleEncerrarAvaliacoes}
        onCancelar={() => setModalEncerrarAberto(false)}
      />
    </div>
  )
}

export default DetalhesPartida
