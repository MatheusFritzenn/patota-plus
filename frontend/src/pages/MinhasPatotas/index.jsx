import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import supabase from '../../services/supabaseClient.js'
import api from '../../services/api.js'
import CardPatota from '../../components/CardPatota.jsx'

function MinhasPatotas() {
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
      const resposta = await api.get('/patotas/minhas')
      setArrayPatotas(resposta.data)
      setCarregando(false)
    } 
    catch (erroRequisicao) {
      console.error('Erro ao buscar patotas:', erroRequisicao)
      setErro('Erro ao carregar suas patotas.')
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
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Minhas Patotas</h2>

      {arrayPatotas.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-4">
            Você ainda não participa de nenhuma patota.
          </p>
          <Link
            to="/criar-patota"
            className="text-green-600 hover:underline font-medium"
          >
            Crie sua primeira patota
          </Link>
        </div>
      )}

      {arrayPatotas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {arrayPatotas.map((patota) => (
            <CardPatota key={patota.id} patota={patota} />
          ))}
        </div>
      )}
    </main>
  )
}

export default MinhasPatotas
