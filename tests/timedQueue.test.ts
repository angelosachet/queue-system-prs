import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { TimedQueueService } from '../src/services/timedQueue.service';

// Mock the QueueJob to prevent cron jobs from running
jest.mock('../src/jobs/queueJob', () => ({
  QueueJob: {
    getInstance: () => ({
      scheduleTurnTimeout: jest.fn(),
      cancelJob: jest.fn(),
      scheduleCompletion: jest.fn()
    })
  }
}));

let prisma: PrismaClient;
let timedQueueService: TimedQueueService;

beforeAll(() => {
  prisma = (global as any).prisma as PrismaClient;
  timedQueueService = new TimedQueueService();
});
describe('Timed Queue System', () => {
  let simulatorId: number;
  let player1Id: number;
  let player2Id: number;
  beforeEach(async () => {
    // Setup test data
    const simulator = await prisma.simulator.create({
      data: {
        name: 'Test Simulator',
        active: true
      }
    });
    simulatorId = simulator.id;
    const player1 = await prisma.user.create({
      data: {
        name: 'Test Player 1',
        email: 'testplayer1@mail.com',
        password: 'temp',
        role: 'PLAYER',
        inQueue: true
      }
    });
    player1Id = player1.id;
    const player2 = await prisma.user.create({
      data: {
        name: 'Test Player 2',
        email:"testplayer@mail.com",
        password: 'temp',
        role: 'PLAYER',
        inQueue: true
      }
    });
    player2Id = player2.id;
    // Add players to queue
    await prisma.queue.create({
      data: {
        UserId: player1Id,
        SimulatorId: simulatorId,
        position: 1,
        status: 'WAITING'
      }
    });
    await prisma.queue.create({
      data: {
        UserId: player2Id,
        SimulatorId: simulatorId,
        position: 2,
        status: 'WAITING'
      }
    });
  });
  afterEach(async () => {
    // Cleanup test data
    await prisma.queue.deleteMany({
      where: { SimulatorId: simulatorId }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [player1Id, player2Id] } }
    });
    await prisma.simulator.delete({
      where: { id: simulatorId }
    });
  });
  afterAll(async () => {
    // No need to disconnect as we're using global prisma
  });
  it('should start timed queue and assign first player', async () => {
    const result = await timedQueueService.processNextInQueue(simulatorId);
    
    expect(result!).toBeDefined();
    expect(result!.player.id).toBe(player1Id);
    expect(result!.turnStartAt).toBeInstanceOf(Date);
    expect(result!.expiresAt).toBeInstanceOf(Date);
  });

  it('should get queue status with correct information', async () => {
    await timedQueueService.processNextInQueue(simulatorId);
    const queueStatus = await timedQueueService.getQueueStatus(simulatorId);
    
    expect(queueStatus).toHaveLength(2);
    expect(queueStatus[0].status).toBe('ACTIVE');
    expect(queueStatus[0].player.id).toBe(player1Id);
    expect(queueStatus[1].status).toBe('WAITING');
    expect(queueStatus[1].player.id).toBe(player2Id);
  });

  it('should confirm player turn', async () => {
    await timedQueueService.processNextInQueue(simulatorId);
    const activeQueue = await prisma.queue.findFirst({
      where: {
        SimulatorId: simulatorId,
        status: 'ACTIVE'
      }
    });
    const resultConfirm = await timedQueueService.confirmPlayerTurn(activeQueue!.id);
    
    expect(resultConfirm.confirmed).toBe(true);
    expect(resultConfirm.player.id).toBe(player1Id);
  });

  it('should re-queue player on missed confirmation', async () => {
    // Create a new player for this test
    const player3 = await prisma.user.create({
      data: {
        name: 'Test Player 3',
        email: 'testplayer3@mail.com',
        password: 'temp',
        role: 'PLAYER',
        inQueue: true
      }
    });

    const queueEntry = await prisma.queue.create({
      data: {
        UserId: player3.id,
        SimulatorId: simulatorId, // Use the existing simulator
        position: 3,
        status: 'ACTIVE',
        turnStartAt: new Date(),
        expiresAt: new Date(Date.now() - 1000) // Already expired
      }
    });

    await timedQueueService.handleMissedConfirmation(queueEntry.id);

    const updatedQueue = await prisma.queue.findUnique({
      where: { id: queueEntry.id }
    });

    expect(updatedQueue!.status).toBe('WAITING');
    expect(updatedQueue!.missedTurns).toBe(1);

    // Cleanup
    await prisma.queue.delete({ where: { id: queueEntry.id } });
    await prisma.user.delete({ where: { id: player3.id } });
  });

  it('should calculate estimated wait time', async () => {
    const waitTime = await timedQueueService.calculateWaitTime(simulatorId, 2);
    
    expect(waitTime).toBeGreaterThan(0);
    expect(typeof waitTime).toBe('number');
  });
});