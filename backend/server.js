import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import usuariosRoutes from './usuarios/routes.js'
import patotasRoutes from './patotas/routes.js'
import partidasRoutes from './partidas/routes.js'
import mensalidadesRoutes from './mensalidades/routes.js'
import movimentacoesRoutes from './movimentacoes/routes.js'

const app = express()

const arrayOrigensPermitidas = ['http://localhost:5173']

if (process.env.FRONTEND_URL) {
  arrayOrigensPermitidas.push(process.env.FRONTEND_URL)
}

// Permite o frontend local e o endereço publicado configurado no ambiente
app.use(cors({
  origin: arrayOrigensPermitidas,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Habilita o parsing de JSON no body das requisições
app.use(express.json())

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'Servidor rodando!' })
})

// Rotas
app.use('/usuarios', usuariosRoutes)
app.use('/patotas', patotasRoutes)
app.use('/partidas', partidasRoutes)
app.use('/mensalidades', mensalidadesRoutes)
app.use('/movimentacoes', movimentacoesRoutes)

export default app
