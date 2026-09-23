import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import api from '../../services/api.js'
import ibgeApi from '../../services/ibgeApi.js'
import { enviarEmblema, excluirEmblema, validarArquivoEmblema } from '../../services/emblemasPatotas.js'
import EmblemaPatota from '../../components/EmblemaPatota.jsx'

// Modalidades hardcodadas (IDs correspondem ao banco)
const arrayModalidades = [
  { id: 1, nome: 'Futebol de campo' },
  { id: 2, nome: 'Futebol society' },
  { id: 3, nome: 'Futebol de salão' }
]

// Dias da semana
const arrayDiasSemana = [
  { id: 1, nome: 'Segunda-feira' },
  { id: 2, nome: 'Terça-feira' },
  { id: 3, nome: 'Quarta-feira' },
  { id: 4, nome: 'Quinta-feira' },
  { id: 5, nome: 'Sexta-feira' },
  { id: 6, nome: 'Sábado' },
  { id: 7, nome: 'Domingo' }
]

function CriarPatota() {
  const { id } = useParams()
  const modoEdicao = !!id

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [modalidadeId, setModalidadeId] = useState('')
  const [rua, setRua] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [arrayEstados, setArrayEstados] = useState([])
  const [arrayCidades, setArrayCidades] = useState([])
  const [diaHabitual, setDiaHabitual] = useState('')
  const [horaHabitual, setHoraHabitual] = useState('')
  const [emblemaPath, setEmblemaPath] = useState('')
  const [arquivoEmblema, setArquivoEmblema] = useState(null)
  const [previewEmblema, setPreviewEmblema] = useState('')
  const [removerEmblema, setRemoverEmblema] = useState(false)
  const [patotaCriadaId, setPatotaCriadaId] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [carregandoDados, setCarregandoDados] = useState(modoEdicao)

  const navigate = useNavigate()
  const inputEmblemaRef = useRef(null)

  useEffect(() => {
    return function () {
      if (previewEmblema) URL.revokeObjectURL(previewEmblema)
    }
  }, [previewEmblema])

  useEffect(() => {
    carregarEstados()
  }, [])

  useEffect(() => {
    if (estado) {
      carregarCidades(estado)
    } else {
      setArrayCidades([])
    }
  }, [estado])

  useEffect(() => {
    if (modoEdicao) {
      carregarPatota()
    }
  }, [id])

  async function carregarEstados() {
    try {
      const resposta = await ibgeApi.get('/estados?orderBy=nome')
      setArrayEstados(resposta.data)
    }
    catch (erro) {
      console.error('Erro ao carregar estados:', erro)
      setErro('Erro ao carregar estados.')
    }
  }

  async function carregarCidades(estado) {
    try {
      const resposta = await ibgeApi.get('/estados/' + estado + '/municipios?orderBy=nome')
      setArrayCidades(resposta.data)
    }
    catch (erro) {
      console.error('Erro ao carregar cidades:', erro)
      setErro('Erro ao carregar cidades.')
    }
  }

  function alterarEstado(novoEstado) {
    setCidade('')
    setEstado(novoEstado)
  }

  async function carregarPatota() {
    try {
      const resposta = await api.get('/patotas/' + id)
      const patota = resposta.data

      setNome(patota.nome || '')
      setDescricao(patota.descricao || '')
      setModalidadeId(String(patota.modalidadeId) || '')
      setRua(patota.rua || '')
      setCidade(patota.cidade || '')
      setEstado(patota.estado || '')
      setDiaHabitual(patota.diaHabitual ? String(patota.diaHabitual) : '')
      setHoraHabitual(patota.horaHabitual ? patota.horaHabitual.substring(0, 5) : '')
      setEmblemaPath(patota.emblemaPath || '')

      setCarregandoDados(false)
    } catch (erroRequisicao) {
      console.error('Erro ao carregar patota:', erroRequisicao)
      setErro('Erro ao carregar dados da patota.')
      setCarregandoDados(false)
    }
  }

  function selecionarEmblema(evento) {
    const arquivo = evento.target.files[0]
    if (!arquivo) return

    const mensagemErro = validarArquivoEmblema(arquivo)
    if (mensagemErro) {
      setArquivoEmblema(null)
      setPreviewEmblema('')
      setRemoverEmblema(false)
      setErro(mensagemErro)
      evento.target.value = ''
      return
    }

    setArquivoEmblema(arquivo)
    setPreviewEmblema(URL.createObjectURL(arquivo))
    setRemoverEmblema(false)
    setErro('')
  }

  function removerSelecaoEmblema() {
    setArquivoEmblema(null)
    setPreviewEmblema('')
    setRemoverEmblema(true)
    if (inputEmblemaRef.current) {
      inputEmblemaRef.current.value = ''
    }
  }

  async function handleSubmit(evento) {
    evento.preventDefault()
    setErro('')

    if (!modalidadeId) {
      setErro('Selecione uma modalidade.')
      return
    }

    setCarregando(true)
    const dadosPatota = {
      nome: nome,
      descricao: descricao,
      modalidadeId: Number(modalidadeId),
      rua: rua,
      cidade: cidade,
      estado: estado,
      diaHabitual: diaHabitual ? Number(diaHabitual) : null,
      horaHabitual: horaHabitual || null
    }

    let patotaAlvoId = id || patotaCriadaId
    let caminhoNovo = ''

    try {
      if (!patotaAlvoId) {
        const resposta = await api.post('/patotas', dadosPatota)
        patotaAlvoId = resposta.data.id
        setPatotaCriadaId(patotaAlvoId)
      }

      if (arquivoEmblema) {
        caminhoNovo = await enviarEmblema(patotaAlvoId, arquivoEmblema)
        dadosPatota.emblemaPath = caminhoNovo
      } else if (removerEmblema && modoEdicao) {
        dadosPatota.emblemaPath = null
      }

      if (modoEdicao || patotaCriadaId || caminhoNovo) {
        await api.put('/patotas/' + patotaAlvoId, dadosPatota)
      }

      if (emblemaPath && (caminhoNovo || removerEmblema)) {
        try {
          await excluirEmblema(emblemaPath)
        } catch (erroExclusao) {
          console.warn('Não foi possível remover o emblema anterior:', erroExclusao)
        }
      }

      if (modoEdicao) {
        navigate('/patota/' + patotaAlvoId)
      } else {
        navigate('/minhas-patotas')
      }
    } catch (erroRequisicao) {
      console.error('Erro ao salvar patota ou emblema:', erroRequisicao)
      if (caminhoNovo) {
        try {
          await excluirEmblema(caminhoNovo)
        } catch (erroExclusao) {
          console.warn('Não foi possível limpar o upload não salvo:', erroExclusao)
        }
      }

      if (!modoEdicao && patotaAlvoId) {
        setErro('A patota foi criada, mas não foi possível concluir o salvamento. Tente novamente nesta tela para não criar outra patota.')
      } else {
        setErro('Erro ao salvar patota. Tente novamente.')
      }
    } finally {
      setCarregando(false)
    }
  }

  if (carregandoDados) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-gray-500 text-center">Carregando...</p>
      </main>
    )
  }

  let rotaCancelar = '/minhas-patotas'
  if (modoEdicao) rotaCancelar = '/patota/' + id
  if (patotaCriadaId) rotaCancelar = '/patota/' + patotaCriadaId
  const formularioEdicao = modoEdicao || !!patotaCriadaId

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Título */}
        <h1 className="text-2xl font-bold text-green-700 mb-2">
          {formularioEdicao ? 'Editar Patota' : 'Criar Patota'}
        </h1>
        <p className="text-gray-500 mb-8">
          {formularioEdicao ? 'Altere os dados da sua patota' : 'Preencha os dados para criar sua patota'}
        </p>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="emblemaPatota" className="text-sm font-medium text-gray-700">
              Emblema da patota (opcional)
            </label>
            <div className="flex flex-wrap items-center gap-5 rounded-xl border border-green-100 bg-green-50/50 p-4">
              <EmblemaPatota
                nome={nome}
                emblemaPath={removerEmblema ? '' : emblemaPath}
                previewUrl={previewEmblema}
                tamanho="formulario"
              />
              <div className="min-w-0 flex-1">
                <input
                  ref={inputEmblemaRef}
                  id="emblemaPatota"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={selecionarEmblema}
                  className="block w-full text-sm text-gray-600 file:cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-green-600 file:px-3 file:py-2 file:font-medium file:text-white file:hover:bg-green-700"
                />
                <p className="mt-2 text-xs text-gray-500">PNG, JPG ou WebP, até 2 MB. Prefira uma imagem quadrada.</p>
                {(arquivoEmblema || (emblemaPath && !removerEmblema)) && (
                  <button
                    type="button"
                    onClick={removerSelecaoEmblema}
                    className="mt-2 text-sm font-medium text-red-600 hover:underline"
                  >
                    Remover emblema
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Nome da patota */}
          <div className="flex flex-col gap-1">
            <label htmlFor="nome" className="text-sm font-medium text-gray-700">
              Nome da patota
            </label>
            <input
              id="nome"
              type="text"
              placeholder="Ex: Pelada do Sábado"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Descrição */}
          <div className="flex flex-col gap-1">
            <label htmlFor="descricao" className="text-sm font-medium text-gray-700">
              Descrição (opcional)
            </label>
            <textarea
              id="descricao"
              placeholder="Descreva sua patota..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Modalidade */}
          <div className="flex flex-col gap-1">
            <label htmlFor="modalidade" className="text-sm font-medium text-gray-700">
              Modalidade
            </label>
            <select
              id="modalidade"
              value={modalidadeId}
              onChange={(e) => setModalidadeId(e.target.value)}
              required
              className={`border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${modalidadeId ? 'text-gray-900' : 'text-gray-400'}`}
            >
              <option value="" disabled>Selecione a modalidade</option>
              {arrayModalidades.map((modalidade) => (
                <option key={modalidade.id} value={modalidade.id}>
                  {modalidade.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Rua */}
          <div className="flex flex-col gap-1">
            <label htmlFor="rua" className="text-sm font-medium text-gray-700">
              Rua
            </label>
            <input
              id="rua"
              type="text"
              placeholder="Ex: Rua das Flores, 123"
              value={rua}
              onChange={(e) => setRua(e.target.value)}
              required
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Estado */}
          <div className="flex flex-col gap-1">
            <label htmlFor="estado" className="text-sm font-medium text-gray-700">
              Estado
            </label>
            <select
              id="estado"
              value={estado}
              onChange={(e) => alterarEstado(e.target.value)}
              required
              className={`border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${estado ? 'text-gray-900' : 'text-gray-400'}`}
            >
              <option value="" disabled>Selecione o estado</option>
              {arrayEstados.map((estadoOpcao) => (
                <option key={estadoOpcao.id} value={estadoOpcao.sigla}>
                  {estadoOpcao.nome} ({estadoOpcao.sigla})
                </option>
              ))}
            </select>
          </div>

          {/* Cidade */}
          <div className="flex flex-col gap-1">
            <label htmlFor="cidade" className="text-sm font-medium text-gray-700">
              Cidade
            </label>
            <select
              id="cidade"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              required
              disabled={!estado}
              className={`border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${cidade ? 'text-gray-900' : 'text-gray-400'}`}
            >
              <option value="" disabled>
                {estado ? 'Selecione a cidade' : 'Selecione primeiro o estado'}
              </option>
              {arrayCidades.map((cidadeOpcao) => (
                <option key={cidadeOpcao.id} value={cidadeOpcao.nome}>
                  {cidadeOpcao.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Dia habitual */}
          <div className="flex flex-col gap-1">
            <label htmlFor="diaHabitual" className="text-sm font-medium text-gray-700">
              Dia habitual (opcional)
            </label>
            <select
              id="diaHabitual"
              value={diaHabitual}
              onChange={(e) => setDiaHabitual(e.target.value)}
              className={`border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${diaHabitual ? 'text-gray-900' : 'text-gray-400'}`}
            >
              <option value="" disabled>Selecione o dia</option>
              {arrayDiasSemana.map((dia) => (
                <option key={dia.id} value={dia.id}>
                  {dia.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Hora habitual */}
          <div className="flex flex-col gap-1">
            <label htmlFor="horaHabitual" className="text-sm font-medium text-gray-700">
              Horário habitual (opcional)
            </label>
            <input
              id="horaHabitual"
              type="time"
              value={horaHabitual}
              onChange={(e) => setHoraHabitual(e.target.value)}
              className={`border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${horaHabitual ? 'text-gray-900' : 'text-gray-400'}`}
            />
          </div>

          {/* Mensagem de erro */}
          {erro && (
            <p className="text-red-500 text-sm text-center" role="alert">{erro}</p>
          )}

          {/* Botões */}
          <div className="flex gap-3 mt-2">
            <Link
              to={rotaCancelar}
              className="flex-1 text-center border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={carregando}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {carregando
                ? (formularioEdicao ? 'Salvando...' : 'Criando...')
                : (formularioEdicao ? 'Salvar' : 'Criar Patota')
              }
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default CriarPatota
