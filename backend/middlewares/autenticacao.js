import supabase from '../services/supabaseClient.js'

export async function autenticar(req, res, next) {
  try {
    const authorization = req.headers.authorization

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({ erro: 'Token de autenticação não informado' })
    }

    const token = authorization.substring(7).trim()

    if (!token) {
      return res.status(401).json({ erro: 'Token de autenticação não informado' })
    }

    const { data, error } = await supabase.auth.getClaims(token)

    if (error || !data || !data.claims || !data.claims.sub) {
      return res.status(401).json({ erro: 'Token inválido ou expirado' })
    }

    const audience = data.claims.aud
    let audienceValida = audience === 'authenticated'

    if (Array.isArray(audience) && audience.includes('authenticated')) {
      audienceValida = true
    }

    if (!audienceValida) {
      return res.status(401).json({ erro: 'Token não pertence a um usuário autenticado' })
    }

    req.usuarioId = data.claims.sub
    req.usuarioEmail = data.claims.email

    return next()
  }
  catch (erro) {
    console.error('Erro ao autenticar requisição:', erro)
    return res.status(401).json({ erro: 'Não foi possível autenticar a requisição' })
  }
}
