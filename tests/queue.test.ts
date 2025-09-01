import request from 'supertest';
import { app } from '../src/app';

describe('Queue CRUD', () => {
  beforeEach(async () => {
    await global.prisma.queue.deleteMany();
    await global.prisma.player.deleteMany();
    await global.prisma.simulator.deleteMany();
  });

  afterAll(async () => {
    await global.prisma.$disconnect();
  });

  it('should add players to queue', async () => {
    const simulator = await global.prisma.simulator.create({ data: { name: 'Sim1' } });
    const player1 = await global.prisma.player.create({ data: { name: 'Player1', email: 'player1@test.com' } });
    const player2 = await global.prisma.player.create({ data: { name: 'Player2', email: 'player2@test.com' } });

    const res1 = await request(app).post('/queue').send({ playerId: player1.id, simulatorId: simulator.id });
    const res2 = await request(app).post('/queue').send({ playerId: player2.id, simulatorId: simulator.id });

    expect(res1.status).toBe(201);
    expect(res1.body.position).toBe(1);
    expect(res2.status).toBe(201);
    expect(res2.body.position).toBe(2);
  });

  it('should list the queue', async () => {
    const simulator = await global.prisma.simulator.create({ data: { name: 'Sim2' } });
    const player = await global.prisma.player.create({ data: { name: 'Player3', email: 'player3@test.com' } });

    await global.prisma.queue.create({ data: { PlayerId: player.id, SimulatorId: simulator.id, position: 1 } });

    const res = await request(app).get(`/queue/${simulator.id}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].Player.name).toBe('Player3');
  });

  it('should remove a player from the queue', async () => {
    const simulator = await global.prisma.simulator.create({ data: { name: 'Sim3' } });
    const player = await global.prisma.player.create({ data: { name: 'Player4', email: 'player4@test.com' } });

    const queueItem = await global.prisma.queue.create({ data: { PlayerId: player.id, SimulatorId: simulator.id, position: 1 } });

    const res = await request(app).delete(`/queue/${queueItem.id}`);
    expect(res.status).toBe(204);
  });

  it('should move a player within the queue', async () => {
    const simulator = await global.prisma.simulator.create({ data: { name: 'Sim4' } });
    const p1 = await global.prisma.player.create({ data: { name: 'P1', email: 'p1@test.com' } });
    const p2 = await global.prisma.player.create({ data: { name: 'P2', email: 'p2@test.com' } });

    const q1 = await global.prisma.queue.create({ data: { PlayerId: p1.id, SimulatorId: simulator.id, position: 1 } });
    const q2 = await global.prisma.queue.create({ data: { PlayerId: p2.id, SimulatorId: simulator.id, position: 2 } });

    const res = await request(app).put(`/queue/${q2.id}/move`).send({ newPosition: 1 });
    expect(res.status).toBe(200);

    const queue = await global.prisma.queue.findMany({ where: { SimulatorId: simulator.id }, orderBy: { position: 'asc' } });
    expect(queue[0].id).toBe(q2.id);
    expect(queue[1].id).toBe(q1.id);
  });
});
