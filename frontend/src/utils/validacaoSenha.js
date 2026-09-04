export function obterRequisitosSenha(senha) {
  const arrayRequisitos = [
    { id: 'tamanho', texto: 'No mínimo 8 caracteres', atendido: senha.length >= 8 },
    { id: 'maiuscula', texto: 'Uma letra maiúscula', atendido: /[A-Z]/.test(senha) },
    { id: 'minuscula', texto: 'Uma letra minúscula', atendido: /[a-z]/.test(senha) },
    { id: 'numero', texto: 'Um número', atendido: /[0-9]/.test(senha) },
    { id: 'especial', texto: 'Um caractere especial', atendido: /[^A-Za-z0-9\s]/.test(senha) }
  ]

  return arrayRequisitos
}

export function senhaAtendeRequisitos(senha) {
  const arrayRequisitos = obterRequisitosSenha(senha)

  for (const requisito of arrayRequisitos) {
    if (!requisito.atendido) {
      return false
    }
  }

  return true
}

export const mensagemSenhaInvalida = 'A senha deve ter no mínimo 8 caracteres, incluindo letra maiúscula, letra minúscula, número e caractere especial.'
