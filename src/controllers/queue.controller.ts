import { Request, Response } from 'express';
import { QueueService } from '../services/queue.service';

const service = new QueueService();

export class QueueController {
  // Adiciona jogador à fila
  async addPlayer(req: Request, res: Response) {
    try {
      const { PlayerId, SimulatorId } = req.body;

      if (!PlayerId || !SimulatorId) {
        return res.status(400).json({ error: 'PlayerId and SimulatorId are required' });
      }

      const queueItem = await service.addPlayerToQueue(Number(PlayerId), Number(SimulatorId));
      return res.status(201).json(queueItem);
    } catch (err: any) {
      if (err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message });
    }
  }

  // Lista todos os jogadores na fila de um simulador
  async listQueue(req: Request, res: Response) {
    try {
      const simulatorId = Number(req.params.simulatorId);
      if (isNaN(simulatorId)) {
        return res.status(400).json({ error: 'Invalid simulatorId' });
      }

      const queue = await service.getQueue(simulatorId);
      return res.status(200).json(queue);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Remove jogador da fila e reorganiza posições
  async removePlayer(req: Request, res: Response) {
    try {
      const queueId = Number(req.params.queueId);
      if (isNaN(queueId)) {
        return res.status(400).json({ error: 'Invalid queueId' });
      }

      await service.removePlayerFromQueue(queueId);
      return res.status(204).send();
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  }

  // Move jogador para nova posição
  async movePlayer(req: Request, res: Response) {
    try {
      const queueId = Number(req.params.queueId);
      const newPosition = Number(req.body.newPosition);

      if (isNaN(queueId) || isNaN(newPosition)) {
        return res.status(400).json({ error: 'Invalid queueId or newPosition' });
      }

      const updated = await service.movePlayer(queueId, newPosition);
      return res.status(200).json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}
