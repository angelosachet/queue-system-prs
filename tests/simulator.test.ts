import request from 'supertest';
import { app } from '../src/app';

describe('Simulator CRUD', () => {
  beforeEach(async () => {
    await global.prisma.queue.deleteMany();
    await global.prisma.player.deleteMany();
    await global.prisma.user.deleteMany();
    await global.prisma.simulator.deleteMany();
  });

  afterAll(async () => {
    await global.prisma.$disconnect();
  });

  it('should create a simulator', async () => {
    const res = await request(app).post('/simulators').send({ name: 'Simulator A' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Simulator A');

    const simulators = await global.prisma.simulator.findMany({
      include: { Queue: true }
    });
    expect(simulators.length).toBe(1);
    expect(simulators[0].Queue.length).toBe(0); // No dummy player created anymore
  });

  it('should list simulators', async () => {
    await request(app).post('/simulators').send({ name: 'Simulator B' });

    const res = await request(app).get('/simulators');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('Simulator B');
  });

  it('should update a simulator', async () => {
    const createRes = await request(app).post('/simulators').send({ name: 'Old Name' });
    const sim = createRes.body;
    const res = await request(app).put(`/simulators/${sim.id}`).send({ name: 'New Name', active: false });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
    expect(res.body.active).toBe(false);
  });

  it('should delete a simulator', async () => {
    const createRes = await request(app).post('/simulators').send({ name: 'To Delete' });
    expect(createRes.status).toBe(201);
    const sim = createRes.body;
    expect(sim.id).toBeDefined();
    
    const res = await request(app).delete(`/simulators/${sim.id}`);
    expect(res.status).toBe(204);

    const exists = await global.prisma.simulator.findUnique({ where: { id: sim.id } });
    expect(exists).toBeNull();
  });

  it('should activate/deactivate a simulator', async () => {
    const createRes = await request(app).post('/simulators').send({ name: 'Sim Active' });
    const sim = createRes.body;
    const res = await request(app).put(`/simulators/${sim.id}/active`).send({ active: true });
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(true);
  });
});
