import { useState, useEffect, useRef } from 'react'
import { CalendarDays, CirclePlus, MapPin, Shield, Upload } from 'lucide-react'
import './style.css'
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
    <main className="criar-patota-page mx-auto max-w-[836px] px-4 py-7 text-[#172d20] sm:px-7">
      <h1 className="mb-2 text-[26px] font-semibold leading-tight tracking-[-0.7px]">{formularioEdicao ? 'Editar patota' : 'Criar patota'}</h1>
      <p className="mb-[22px] text-[13px] text-[#65736a]">{formularioEdicao ? 'Atualize os dados e a rotina da sua patota.' : 'Dê um nome à sua turma e organize o próximo jogo.'}</p>
      <form onSubmit={handleSubmit} aria-busy={carregando} className="rounded-[22px] border border-[#dce5df] bg-white px-5 sm:px-7">
        <fieldset disabled={carregando} className="min-w-0">
          <section className="border-b border-[#dce5df] py-6" aria-labelledby="patota-identidade">
            <h2 id="patota-identidade" className="patota-form-heading"><Shield size={18} aria-hidden="true" />Sua patota</h2>
            <div className="mb-[22px] flex flex-wrap items-center gap-[18px] rounded-[14px] bg-[#edf8f0] p-[18px]">
              <EmblemaPatota nome={nome} emblemaPath={removerEmblema ? '' : emblemaPath} previewUrl={previewEmblema} tamanho="formulario" />
              <div className="min-w-[150px] flex-1">
                <p className="patota-form-label">Emblema <span className="patota-form-optional">· opcional</span></p>
                <div className="flex flex-wrap items-center gap-x-3">
                  <label className="patota-form-button relative focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-green-700">
                    <Upload size={16} aria-hidden="true" />Escolher imagem
                    <input ref={inputEmblemaRef} id="emblemaPatota" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Escolher emblema" aria-describedby="emblema-ajuda" onChange={selecionarEmblema} className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                  </label>
                  {(arquivoEmblema || (emblemaPath && !removerEmblema)) && <button type="button" onClick={removerSelecaoEmblema} className="min-h-11 text-xs text-red-700 hover:underline cursor-pointer">Remover emblema</button>}
                </div>
                <p id="emblema-ajuda" className="mt-2 text-[11px] leading-relaxed text-[#65736a]">PNG, JPG ou WebP, até 2 MB. Prefira uma imagem quadrada.</p>
                {arquivoEmblema && <p className="mt-1 break-all text-xs text-[#65736a]" role="status">{arquivoEmblema.name}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-[18px]">
              <div>
                <label htmlFor="nome" className="patota-form-label">Nome da patota</label>
                <input id="nome" type="text" placeholder="Ex.: Pelada do Sábado" value={nome} onChange={(e) => setNome(e.target.value)} required className="patota-form-input" />
              </div>
              <div>
                <label htmlFor="descricao" className="patota-form-label">Descrição <span className="patota-form-optional">· opcional</span></label>
                <textarea id="descricao" placeholder="Conte um pouco sobre a turma e os jogos." value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} className="patota-form-input resize-y" />
              </div>
              <fieldset className="min-w-0" aria-describedby="modalidade-ajuda">
                <legend className="patota-form-label">Modalidade</legend>
                <p id="modalidade-ajuda" className="mb-3.5 text-xs text-[#65736a]">Escolha a modalidade da sua patota.</p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {arrayModalidades.map((modalidade) => (
                    <label key={modalidade.id} className="patota-form-option">
                      <input type="radio" name="modalidade" value={String(modalidade.id)} checked={modalidadeId === String(modalidade.id)} onChange={(e) => setModalidadeId(e.target.value)} required />
                      <span>{modalidade.nome}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </section>

          <section className="border-b border-[#dce5df] py-6" aria-labelledby="patota-local">
            <h2 id="patota-local" className="patota-form-heading"><MapPin size={18} aria-hidden="true" />Local dos jogos</h2>
            <div className="flex flex-col gap-[18px]">
              <div>
                <label htmlFor="rua" className="patota-form-label">Rua</label>
                <input id="rua" type="text" placeholder="Ex.: Rua das Flores, 123" value={rua} onChange={(e) => setRua(e.target.value)} required className="patota-form-input" />
              </div>
              <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
                <div className="min-w-0">
                  <label htmlFor="estado" className="patota-form-label">Estado</label>
                  <select id="estado" value={estado} onChange={(e) => alterarEstado(e.target.value)} required className="patota-form-input">
                    <option value="" disabled>Selecione o estado</option>
                    {arrayEstados.map((estadoOpcao) => <option key={estadoOpcao.id} value={estadoOpcao.sigla}>{estadoOpcao.nome} ({estadoOpcao.sigla})</option>)}
                  </select>
                </div>
                <div className="min-w-0">
                  <label htmlFor="cidade" className="patota-form-label">Cidade</label>
                  <select id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} required disabled={!estado} className="patota-form-input">
                    <option value="" disabled>{estado ? 'Selecione a cidade' : 'Selecione primeiro o estado'}</option>
                    {arrayCidades.map((cidadeOpcao) => <option key={cidadeOpcao.id} value={cidadeOpcao.nome}>{cidadeOpcao.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="border-b border-[#dce5df] py-6" aria-labelledby="patota-rotina">
            <h2 id="patota-rotina" className="patota-form-heading"><CalendarDays size={18} aria-hidden="true" />Rotina da patota</h2>
            <p className="mb-3.5 text-xs leading-relaxed text-[#65736a]">Defina o dia e o horário de costume para facilitar a criação das próximas partidas.</p>
            <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="diaHabitual" className="patota-form-label">Dia habitual <span className="patota-form-optional">· opcional</span></label>
                <select id="diaHabitual" value={diaHabitual} onChange={(e) => setDiaHabitual(e.target.value)} className="patota-form-input">
                  <option value="">Sem dia definido</option>
                  {arrayDiasSemana.map((dia) => <option key={dia.id} value={dia.id}>{dia.nome}</option>)}
                </select>
              </div>
              <div className="min-w-0">
                <label htmlFor="horaHabitual" className="patota-form-label">Horário habitual <span className="patota-form-optional">· opcional</span></label>
                <input id="horaHabitual" type="time" value={horaHabitual} onChange={(e) => setHoraHabitual(e.target.value)} className="patota-form-input" />
              </div>
            </div>
          </section>
        </fieldset>

        {erro && <p role="alert" className="mt-5 text-sm text-red-700">{erro}</p>}
        <div className="flex flex-wrap justify-end gap-2.5 py-[22px]">
          {carregando ? <button type="button" disabled className="patota-form-button flex-1 sm:flex-none">Cancelar</button> : <Link to={rotaCancelar} className="patota-form-button flex-1 sm:flex-none">Cancelar</Link>}
          <button type="submit" disabled={carregando} className="patota-form-button patota-form-primary flex-1 sm:flex-none">
            {!formularioEdicao && !carregando && <CirclePlus size={18} aria-hidden="true" />}
            {carregando ? (formularioEdicao ? 'Salvando...' : 'Criando...') : (formularioEdicao ? 'Salvar alterações' : 'Criar patota')}
          </button>
        </div>
      </form>
    </main>
  )
}

export default CriarPatota
