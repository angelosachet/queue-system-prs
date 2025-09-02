import { Request, Response } from 'express';
import { TimePatternService } from '../services/timePattern.service';

const service = new TimePatternService();

export class TimePatternController {
  async create(req: Request, res: Response) {
    try {
      const { name, timeMinutes, price } = req.body;
      
      if (!name || !timeMinutes || !price) {
        return res.status(400).json({ error: 'Name, timeMinutes and price are required' });
      }

      const pattern = await service.create(name, Number(timeMinutes), Number(price));
      return res.status(201).json(pattern);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const patterns = await service.findAll();
      return res.json(patterns);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const pattern = await service.findById(id);
      
      if (!pattern) {
        return res.status(404).json({ error: 'Pattern not found' });
      }
      
      return res.json(pattern);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { name, timeMinutes, price } = req.body;
      
      const pattern = await service.update(id, name, Number(timeMinutes), Number(price));
      return res.json(pattern);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await service.delete(id);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}