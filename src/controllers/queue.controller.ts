import { Request, Response } from "express";
import { QueueService } from "../services/queue.service";

const service = new QueueService();

export class QueueController {
  // Adiciona jogador à fila
  async addPlayer(req: Request, res: Response) { 
    try {
      const { playerId, simulatorId, timeMinutes = 5, amountPaid = 0, sellerId } = req.body;
      if (!playerId || !simulatorId)
        return res.status(400).json({ error: 'Player ID and Simulator ID are required' });

      const queue = await service.addPlayerToQueue(
        Number(playerId),   // add a player to a specif simulator queue
        Number(simulatorId),
        Number(timeMinutes),
        Number(amountPaid),
        sellerId ? Number(sellerId) : undefined
      );
      
      return res.status(201).json({
        ...queue,
        message: `Player ${playerId} added to simulator ${simulatorId}'s queue`
      });
    } catch (err: any) {
      const status = err.message.includes('already in this queue') ? 409 : 
                     err.message.includes('not found') ? 404 : 500;
      return res.status(status).json({ error: err.message });
    }
  }

  async createQueue(req: Request, res: Response) {
    try {
      const { PlayerId, SimulatorId } = req.body; //create a queue, at least one player is needed on it (no player should be needed actually change it after)

      if (!PlayerId || !SimulatorId) {
        return res
          .status(400)
          .json({ error: "PlayerId e SimulatorId são obrigatórios" });
      }

      const queueItem = await service.createQueue(
        Number(PlayerId),
        Number(SimulatorId)
      );
      return res.status(201).json(queueItem);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

// list all the players on the queue for a specific sim
  async listQueue(req: Request, res: Response) {
    try {
      const simulatorId = Number(req.params.simulatorId);
      if (isNaN(simulatorId)) {
        return res.status(400).json({ error: "Invalid simulatorId" });
      }

      const queue = await service.getQueue(simulatorId);
      return res.status(200).json(queue);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
  // List all queues for all simulators
  async listAllQueues(req: Request, res: Response) {
    try {
      const queues = await service.getAllQueues();
      return res.status(200).json(queues);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // remove a player from the queue
  async removePlayer(req: Request, res: Response) {
    try {
      const queueId = Number(req.params.queueId);
      if (isNaN(queueId)) {
        return res.status(400).json({ error: "Invalid queueId" });
      }

      await service.removePlayerFromQueue(queueId);
      return res.status(204).send();
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  }

  // Move player to new position
  async movePlayer(req: Request, res: Response) {
    try {
      const queueId = Number(req.params.queueId);
      const newPosition = Number(req.body.newPosition);

      if (isNaN(queueId) || isNaN(newPosition)) {
        return res
          .status(400)
          .json({ error: "Invalid queueId or newPosition" });
      }

      const updated = await service.movePlayer(queueId, newPosition);
      return res.status(200).json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}
