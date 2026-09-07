import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import supabase from '../../services/supabaseClient.js'
import api from '../../services/api.js'
import './style.css'

function BuscarPatotas() {
  const [arrayPatotas, setArrayPatotas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    buscarPatotas()
  }, [])

  async function buscarPatotas() {
    const { data } = await supabase.auth.getUser()

    if (!data || !data.user) {
      setErro('Usuário não autenticado.')
      setCarregando(false)
      return
    }

    try {
      const resposta = await api.get('/patotas/buscar')
      setArrayPatotas(resposta.data)
      setCarregando(false)
    } 
    catch (erroRequisicao) {
      console.error('Erro ao buscar patotas:', erroRequisicao)
      setErro('Erro ao carregar patotas disponíveis.')
      setCarregando(false)
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

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Buscar Patotas</h2>

      {arrayPatotas.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">
            Não há patotas disponíveis no momento.
          </p>
        </div>
      )}

      {arrayPatotas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {arrayPatotas.map((patota) => (
            <Link
              key={patota.id}
              to={'/patota/' + patota.id}
              className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100"
            >
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  {patota.nome}
                </h3>

                <p className="text-sm text-gray-500">
                  {patota.modalidadeNome}
                </p>

                <p className="text-sm text-gray-400">
                  {patota.rua} — {patota.cidade}/{patota.estado}
                </p>

                {patota.descricao && (
                  <p className="text-sm text-gray-500 mt-1">
                    {patota.descricao}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}

export default BuscarPatotas
