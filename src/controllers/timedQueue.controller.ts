import { Router } from 'express';
import { TimedQueueService } from '../services/timedQueue.service';

const router = Router();
const timedQueueService = new TimedQueueService();

// Start timed queue for a simulator
router.post('/simulator/:simulatorId/start-timed-queue', async (req, res) => {
  try {
    const simulatorId = parseInt(req.params.simulatorId);
    
    const result = await timedQueueService.startTimedQueue(simulatorId);
    
    res.json({
      success: true,
      message: 'Timed queue started',
      data: result
    });
  } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error starting timed queue',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
});

// Get queue status for a simulator
router.get('/simulator/:simulatorId/queue-status', async (req, res) => {
  try {
    const simulatorId = parseInt(req.params.simulatorId);
    
    const queueStatus = await timedQueueService.getQueueStatus(simulatorId);
    
    res.json({
      success: true,
      data: queueStatus
    });
  } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error getting queue status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
});

// Process next player in queue
router.post('/simulator/:simulatorId/next-turn', async (req, res) => {
  try {
    const simulatorId = parseInt(req.params.simulatorId);
    
    const result = await timedQueueService.processNextInQueue(simulatorId);
    
    if (!result) {
      return res.json({
        success: true,
        message: 'No players in queue'
      });
    }
    
    res.json({
      success: true,
      message: 'Next player turn started',
      data: result
    });
  } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error processing next turn',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
});

// Confirm player turn
router.post('/queue/:queueId/confirm', async (req, res) => {
  try {
    const queueId = parseInt(req.params.queueId);
    
    const result = await timedQueueService.confirmPlayerTurn(queueId);
    
    res.json({
      success: true,
      message: 'Player turn confirmed',
      data: result
    });
  } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Error confirming turn',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
});

// Handle missed confirmation (manual trigger)
router.post('/queue/:queueId/missed', async (req, res) => {
  try {
    const queueId = parseInt(req.params.queueId);
    
    await timedQueueService.handleMissedConfirmation(queueId);
    
    res.json({
      success: true,
      message: 'Player moved to end of queue'
    });
  } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error handling missed confirmation',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
});

export default router;