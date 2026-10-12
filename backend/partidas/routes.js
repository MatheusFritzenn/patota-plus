import { Router } from 'express'
import { cadastrar, atualizar, excluir, listarPorPatota, buscarPorId, listarParticipantes, alterarPosicaoTemporaria, alterarNotaTemporaria, participar, removerPresenca, finalizar, listarAvaliacoes, salvarAvaliacoes, encerrar, resultadoAvaliacoes, listarTimes, gerar, desfazer } from './controller.js'
import { autenticar } from '../middlewares/autenticacao.js'

const router = Router()

router.use(autenticar)
router.post('/', cadastrar)
router.put('/:id', atualizar)
router.delete('/:id', excluir)
router.get('/patota/:patotaId', listarPorPatota)
router.get('/:id/participantes', listarParticipantes)
router.put('/:id/participantes/:usuarioId/posicao-temporaria', alterarPosicaoTemporaria)
router.put('/:id/participantes/:usuarioId/nota-temporaria', alterarNotaTemporaria)
router.post('/:id/participar', participar)
router.delete('/:id/participar', removerPresenca)
router.delete('/:id/participantes/:usuarioId', removerPresenca)
router.put('/:id/finalizar', finalizar)
router.get('/:id/avaliacoes/resultado', resultadoAvaliacoes)
router.get('/:id/avaliacoes', listarAvaliacoes)
router.post('/:id/avaliacoes', salvarAvaliacoes)
router.put('/:id/avaliacoes/encerrar', encerrar)
router.get('/:id/times', listarTimes)
router.post('/:id/times/gerar', gerar)
router.delete('/:id/times', desfazer)
router.get('/:id', buscarPorId)

export default router
