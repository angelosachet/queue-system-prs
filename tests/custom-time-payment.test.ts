import request from 'supertest';
import { app } from '../src/app';
import './setup';

describe('Custom Time and Payment', () => {
  beforeEach(async () => {
    await global.prisma!.queue.deleteMany();
    await global.prisma!.player.deleteMany();
    await global.prisma!.simulator.deleteMany();
  });

  it('should add player to queue with custom time and payment', async () => {
    // Create simulator and player
    const simulator = await global.prisma!.simulator.create({ data: { name: 'Test Sim' } });
    const player = await global.prisma!.player.create({ data: { name: 'Test Player', email: 'test@test.com' } });

    // Add player to queue with custom time and payment
    const res = await request(app)
      .post('/queue')
      .send({
        playerId: player.id,
        simulatorId: simulator.id,
        timeMinutes: 10,
        amountPaid: 25.50
      });

    expect(res.status).toBe(201);
    expect(res.body.timeMinutes).toBe(10);
    expect(res.body.amountPaid).toBe(25.50);
  });

  it('should use default values when not provided', async () => {
    // Create simulator and player
    const simulator = await global.prisma!.simulator.create({ data: { name: 'Test Sim' } });
    const player = await global.prisma!.player.create({ data: { name: 'Test Player', email: 'test@test.com' } });

    // Add player to queue without custom values
    const res = await request(app)
      .post('/queue')
      .send({
        playerId: player.id,
        simulatorId: simulator.id
      });

    expect(res.status).toBe(201);
    expect(res.body.timeMinutes).toBe(5);
    expect(res.body.amountPaid).toBe(0);
  });

  it('should prevent duplicate players in same queue', async () => {
    const simulator = await global.prisma!.simulator.create({ data: { name: 'Test Sim' } });
    const player = await global.prisma!.player.create({ data: { name: 'Test Player', email: 'test@test.com' } });

    // First addition - should succeed
    const res1 = await request(app).post('/queue').send({
      playerId: player.id,
      simulatorId: simulator.id
    });
    expect(res1.status).toBe(201);

    // Second addition - should fail
    const res2 = await request(app).post('/queue').send({
      playerId: player.id,
      simulatorId: simulator.id
    });
    expect(res2.status).toBe(409);
    expect(res2.body.error).toBe('Player is already in this queue');
  });
});