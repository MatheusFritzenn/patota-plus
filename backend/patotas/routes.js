import { Router } from 'express'
import { cadastrar, listarPorUsuario, listarDisponiveis, buscarPorId, listarMembros, excluirMembro, sairDaPatota, atualizar, excluir, solicitar, listarSolicitacoes, responderSolicitacaoEntrada, verificarMembresia, relatorioPresenca } from './controller.js'
import { autenticar } from '../middlewares/autenticacao.js'

const router = Router()

router.use(autenticar)
router.post('/', cadastrar)
router.put('/:id', atualizar)
router.delete('/:id', excluir)
router.get('/minhas', listarPorUsuario)
router.get('/buscar', listarDisponiveis)
router.get('/:id', buscarPorId)
router.get('/:id/membros', listarMembros)
router.delete('/:id/membros/:usuarioId', excluirMembro)
router.delete('/:id/sair', sairDaPatota)
router.post('/:id/solicitar', solicitar)
router.get('/:id/solicitacoes', listarSolicitacoes)
router.put('/:id/solicitacoes/:solicitacaoId', responderSolicitacaoEntrada)
router.get('/:id/verificar-membro', verificarMembresia)
router.get('/:id/relatorios/presenca', relatorioPresenca)


export default router
