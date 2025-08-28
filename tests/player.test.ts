import request from 'supertest';
import { app } from '../src/app';

describe('Player CRUD', () => {
  beforeEach(async () => {
    await global.prisma.queue.deleteMany();
    await global.prisma.player.deleteMany();
    await global.prisma.simulator.deleteMany();
  });

  afterAll(async () => {
    await global.prisma.$disconnect();
  });

  it('creates a player', async () => {
    const res = await request(app).post('/players').send({ name: 'Maria' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Maria');

    const players = await global.prisma.player.findMany();
    expect(players.length).toBe(1);
  });

  it('lists players', async () => {
    await global.prisma.player.create({ data: { name: 'Maria' } });
    const res = await request(app).get('/players');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('Maria');
  });

  it('updates a player', async () => {
    const player = await global.prisma.player.create({ data: { name: 'Maria' } });
    const res = await request(app).put(`/players/${player.id}`).send({ name: 'Ana' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Ana');
  });

  it('deletes a player', async () => {
    const player = await global.prisma.player.create({ data: { name: 'Maria' } });
    const res = await request(app).delete(`/players/${player.id}`);
    expect(res.status).toBe(204);

    const check = await global.prisma.player.findUnique({ where: { id: player.id } });
    expect(check).toBeNull();
  });
});
