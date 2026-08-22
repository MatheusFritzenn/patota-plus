import { Router } from 'express'
import { cadastrar, buscarPorId, atualizar } from './controller.js'

const router = Router()

router.post('/', cadastrar)

router.get('/:id', buscarPorId)

router.put('/:id', atualizar)

export default router
