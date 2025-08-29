import { Request, Response } from 'express';
import { SimulatorService } from '../services/simulator.service';

const service = new SimulatorService();

export class SimulatorController {
  async create(req: Request, res: Response) {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });

      const simulator = await service.createSimulator(name);
      return res.status(201).json({
        ...simulator,
        message: 'Simulator created with empty queue'
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const simulators = await service.listSimulators();
      return res.json(simulators);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  async get(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const simulator = await service.getSimulatorById(id);
      if (!simulator) return res.status(404).json({ error: 'Simulator not found' });

      return res.json(simulator);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { name, active } = req.body;
      const simulator = await service.updateSimulator(id, name, active);
      return res.json(simulator);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      await service.deleteSimulator(id);
      return res.status(204).send();
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  }

  async setActive(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { active } = req.body;
      const simulator = await service.setActive(id, active);
      return res.json(simulator);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}
