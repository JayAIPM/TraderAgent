import express from 'express'
import { agentController } from '../controllers/AgentController'

const router = express.Router()

router.post('/chat', agentController.processMessage)

export default router
