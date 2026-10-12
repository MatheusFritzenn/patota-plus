import axios from 'axios'

export async function consultarCep(cep, sinal) {
  if (!/^\d{8}$/.test(cep)) throw new Error('Informe um CEP com oito dígitos.')
  const resposta = await axios.get('https://viacep.com.br/ws/' + cep + '/json/', {
    signal: sinal,
    timeout: 8000
  })
  if (resposta.data.erro) throw new Error('CEP não encontrado. Confira o CEP ou preencha o endereço manualmente.')
  return resposta.data
}
