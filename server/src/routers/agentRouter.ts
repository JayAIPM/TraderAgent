import express from 'express'
import { agentController } from '../controllers/AgentController'

const router = express.Router()

router.post('/chat', agentController.processMessage)
router.get('/test', agentController.testIntent)

export default router
