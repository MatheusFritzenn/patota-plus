import { Router } from 'express'
import { consultarCaixa, cadastrarMovimentacao } from './controller.js'

const router = Router()

router.get('/patota/:patotaId', consultarCaixa)
router.post('/patota/:patotaId', cadastrarMovimentacao)

export default router
