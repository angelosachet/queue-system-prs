import { Request, Response } from 'express';
import { PlayerService } from '../services/player.service';

const service = new PlayerService();

export class PlayerController {
  async create(req: Request, res: Response) {
    try {
      const { name, email } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });
      if (!email) return res.status(400).json({ error: 'Email is required' });

      const player = await service.create(name, email);
      return res.status(201).json(player);
    } catch (err: any) {
      if (err.message === 'Email already exists') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: 'Failed to create player' });
    }
  }

  async getAll(req: Request, res: Response) {
    const { email } = req.query;
    const players = await service.findAll(email as string);
    return res.json(players); //return a list with all the players
  }

  async getById(req: Request, res: Response) { // return a user based on a specific ID
    const id = Number(req.params.id);
    const player = await service.findById(id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    return res.json(player);
  }

  async update(req: Request, res: Response) { //update user info, based on id
    try {
      const id = Number(req.params.id);
      const { name, email } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });

      const updated = await service.update(id, name, email);
      return res.json(updated);
    } catch (err: any) {
      if (err.message === 'Email already exists') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      return res.status(404).json({ error: 'Player not found' });
    }
  }

  async delete(req: Request, res: Response) { //remove a user based on id
    try {
      const id = Number(req.params.id);
      await service.delete(id);
      return res.status(204).send();
    } catch {
      return res.status(404).json({ error: 'Player not found' });
    }
  }
}
