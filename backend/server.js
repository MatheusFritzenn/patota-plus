import 'dotenv/config'
import express from 'express'
import usuariosRoutes from './usuarios/routes.js'

const app = express()

// Habilita o parsing de JSON no body das requisições
app.use(express.json())

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'Servidor rodando!' })
})

// Rotas
app.use('/usuarios', usuariosRoutes)

// Inicia o servidor
app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000')
})