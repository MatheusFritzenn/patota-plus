import { Router } from 'express'
import { cadastrar, buscarPorId, atualizar } from './controller.js'
import { autenticar } from '../middlewares/autenticacao.js'

const router = Router()

router.use(autenticar)
router.post('/', cadastrar)
router.get('/me', buscarPorId)
router.put('/me', atualizar)

export default router
