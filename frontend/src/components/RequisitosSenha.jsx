import { obterRequisitosSenha } from '../utils/validacaoSenha.js'

function RequisitosSenha({ senha }) {
  const arrayRequisitos = obterRequisitosSenha(senha)

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2" aria-label="Requisitos da senha">
      {arrayRequisitos.map((requisito) => (
        <li
          key={requisito.id}
          className={requisito.atendido ? 'text-xs text-green-600' : 'text-xs text-gray-500'}
        >
          <span aria-hidden="true">{requisito.atendido ? '✓' : '○'}</span>{' '}
          {requisito.texto}
        </li>
      ))}
    </ul>
  )
}

export default RequisitosSenha
