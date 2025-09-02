import request from 'supertest';
import { app } from '../src/app';

describe('Player CRUD', () => {
  beforeEach(async () => {
    await global.prisma.queue.deleteMany();
    await global.prisma.user.deleteMany();
    await global.prisma.simulator.deleteMany();
  });

  afterAll(async () => {
    await global.prisma.$disconnect();
  });

  it('creates a player', async () => {
    const res = await request(app).post('/players').send({ name: 'Maria', email: 'maria@test.com' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Maria');
    expect(res.body.inQueue).toBe(true);

    const players = await global.prisma.user.findMany({ where: { role: 'PLAYER' } });
    expect(players.length).toBe(1);
  });

  it('lists players', async () => {
    await global.prisma.user.create({ data: { name: 'Maria', email: 'maria@test.com', password: 'temp', role: 'PLAYER' } });
    const res = await request(app).get('/players');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('Maria');
  });

  it('updates a player', async () => {
    const player = await global.prisma.user.create({ data: { name: 'Maria', email: 'maria@test.com', password: 'temp', role: 'PLAYER' } });
    const res = await request(app).put(`/players/${player.id}`).send({ name: 'Ana' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Ana');
  });

  it('deletes a player', async () => {
    const player = await global.prisma.user.create({ data: { name: 'Maria', email: 'maria@test.com', password: 'temp', role: 'PLAYER' } });
    const res = await request(app).delete(`/players/${player.id}`);
    expect(res.status).toBe(204);

    const check = await global.prisma.user.findUnique({ where: { id: player.id } });
    expect(check).toBeNull();
  });
});
