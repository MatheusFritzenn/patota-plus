import { Router } from 'express'
import { consultarRelatorio, alterarValor, alterarStatus } from './controller.js'

const router = Router()

router.get('/patota/:patotaId', consultarRelatorio)
router.put('/patota/:patotaId/valor', alterarValor)
router.put('/patota/:patotaId/membros/:usuarioId', alterarStatus)

export default router
