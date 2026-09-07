import { Router } from 'express'
import { consultarCaixa, cadastrarMovimentacao } from './controller.js'
import { autenticar } from '../middlewares/autenticacao.js'

const router = Router()

router.use(autenticar)
router.get('/patota/:patotaId', consultarCaixa)
router.post('/patota/:patotaId', cadastrarMovimentacao)

export default router
