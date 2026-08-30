import { Router } from 'express'
import { cadastrar, listarPorPatota, buscarPorId, listarParticipantes, participar, removerPresenca, finalizar, listarAvaliacoes, salvarAvaliacoes, encerrar, resultadoAvaliacoes } from './controller.js'

const router = Router()

router.post('/', cadastrar)
router.get('/patota/:patotaId', listarPorPatota)
router.get('/:id/participantes', listarParticipantes)
router.post('/:id/participar', participar)
router.delete('/:id/participar/:usuarioId', removerPresenca)
router.put('/:id/finalizar', finalizar)
router.get('/:id/avaliacoes/resultado', resultadoAvaliacoes)
router.get('/:id/avaliacoes', listarAvaliacoes)
router.post('/:id/avaliacoes', salvarAvaliacoes)
router.put('/:id/avaliacoes/encerrar', encerrar)
router.get('/:id', buscarPorId)

export default router
