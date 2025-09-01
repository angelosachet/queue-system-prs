import { Request, Response } from 'express';
import { TimedQueueService } from '../services/timedQueue.service';

export class TimedQueueController { //starts the timer in specific queue
  private timedQueueService = new TimedQueueService();

  async startTimedQueue(req: Request, res: Response) {
    try {
      const simulatorId = parseInt(req.params.simulatorId);
      const result = await this.timedQueueService.startTimedQueue(simulatorId);
      
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
  }

  async getQueueStatus(req: Request, res: Response) {
    try { //return the queue status
      const simulatorId = parseInt(req.params.simulatorId);
      const queueStatus = await this.timedQueueService.getQueueStatus(simulatorId);
      
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
  }

  async processNext(req: Request, res: Response) {
    try { //processes the next in queue
      const simulatorId = parseInt(req.params.simulatorId);
      const result = await this.timedQueueService.processNextInQueue(simulatorId);
      
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
  }

  async confirmTurn(req: Request, res: Response) {
    try {//confirms a player turn
      const queueId = parseInt(req.params.queueId);
      const result = await this.timedQueueService.confirmPlayerTurn(queueId);
      
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
  }

  async handleMissed(req: Request, res: Response) {
    try { // player missed his turn
      const queueId = parseInt(req.params.queueId);
      await this.timedQueueService.handleMissedConfirmation(queueId);
      
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
  }
}