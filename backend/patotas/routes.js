import { Router } from 'express'
import { cadastrar, listarPorUsuario, listarDisponiveis, buscarPorId, listarMembros, excluirMembro, atualizar, excluir, solicitar, listarSolicitacoes, responderSolicitacaoEntrada, verificarMembresia, relatorioPresenca } from './controller.js'

const router = Router()

router.post('/', cadastrar)
router.put('/:id', atualizar)
router.delete('/:id', excluir)
router.get('/usuario/:id', listarPorUsuario)
router.get('/buscar/:id', listarDisponiveis)
router.get('/:id', buscarPorId)
router.get('/:id/membros', listarMembros)
router.delete('/:id/membros/:usuarioId', excluirMembro)
router.post('/:id/solicitar', solicitar)
router.get('/:id/solicitacoes', listarSolicitacoes)
router.put('/:id/solicitacoes/:solicitacaoId', responderSolicitacaoEntrada)
router.get('/:id/verificar-membro/:usuarioId', verificarMembresia)
router.get('/:id/relatorios/presenca', relatorioPresenca)


export default router
