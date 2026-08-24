import { Router } from 'express'
import { cadastrar, listarPorUsuario, listarDisponiveis, buscarPorId, listarMembros, atualizar, excluir, solicitar, listarSolicitacoes, responderSolicitacaoEntrada, verificarMembresia } from './controller.js'

const router = Router()

router.post('/', cadastrar)
router.get('/usuario/:id', listarPorUsuario)
router.get('/buscar/:id', listarDisponiveis)
router.get('/:id', buscarPorId)
router.get('/:id/membros', listarMembros)
router.put('/:id', atualizar)
router.delete('/:id', excluir)
router.post('/:id/solicitar', solicitar)
router.get('/:id/solicitacoes', listarSolicitacoes)
router.put('/:id/solicitacoes/:solicitacaoId', responderSolicitacaoEntrada)
router.get('/:id/verificar-membro/:usuarioId', verificarMembresia)

export default router
