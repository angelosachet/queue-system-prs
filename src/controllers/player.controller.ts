import { Request, Response } from 'express';
import { PlayerService } from '../services/player.service';

const service = new PlayerService();

export class PlayerController {
  async create(req: Request, res: Response) {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });

      const player = await service.create(name);
      return res.status(201).json(player);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create player' });
    }
  }

  async getAll(_req: Request, res: Response) {
    const players = await service.findAll();
    return res.json(players);
  }

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const player = await service.findById(id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    return res.json(player);
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });

      const updated = await service.update(id, name);
      return res.json(updated);
    } catch {
      return res.status(404).json({ error: 'Player not found' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await service.delete(id);
      return res.status(204).send();
    } catch {
      return res.status(404).json({ error: 'Player not found' });
    }
  }
}
