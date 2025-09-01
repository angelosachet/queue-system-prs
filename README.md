# SimQueue - Queue Management System

A simple queue management system for simulators with timed turns and player management.

## Features

- **Player Management** - Create, update, delete players
- **Simulator Management** - Manage multiple simulators
- **Queue System** - Add players to queues, manage positions
- **Timed Queues** - Automatic turn management with timeouts
- **Real-time Events** - Event system for queue changes

## API Endpoints

### Players
- `GET /players` - List all players
- `POST /players` - Create player
- `GET /players/:id` - Get player by ID
- `PUT /players/:id` - Update player
- `DELETE /players/:id` - Delete player

### Simulators
- `GET /simulators` - List all simulators
- `POST /simulators` - Create simulator
- `GET /simulators/:id` - Get simulator by ID
- `PUT /simulators/:id` - Update simulator
- `DELETE /simulators/:id` - Delete simulator

### Queue Management
- `POST /queue` - Add player to queue
- `GET /queue` - List all queues
- `GET /queue/:simulatorId` - Get queue for simulator
- `DELETE /queue/:queueId` - Remove player from queue
- `PUT /queue/:queueId/move` - Move player position

### Timed Queue
- `POST /timed-queue/simulator/:simulatorId/start` - Start timed queue
- `GET /timed-queue/simulator/:simulatorId/status` - Get queue status
- `POST /timed-queue/simulator/:simulatorId/next` - Process next player
- `POST /timed-queue/:queueId/confirm` - Confirm player turn
- `POST /timed-queue/:queueId/missed` - Handle missed confirmation

## Queue States

- **WAITING** - Player waiting in queue
- **ACTIVE** - Player's turn started, awaiting confirmation (3 min window)
- **CONFIRMED** - Player confirmed, turn in progress (5 min duration)
- **MISSED** - Player missed their confirmation window
- **COMPLETED** - Player finished their turn

## Configuration

- **Turn Duration**: 5 minutes
- **Confirmation Window**: 3 minutes

## Queue Flow

1. **Start Queue** - First player becomes ACTIVE with 3-minute confirmation window
2. **Confirm Turn** - Player becomes CONFIRMED with 5-minute turn timer
3. **Turn Completion** - Player is removed, next player automatically becomes ACTIVE
4. **Missed Confirmation** - Player moved to end of queue, next player becomes ACTIVE

## Setup

1. Install dependencies: `npm install`
2. Setup database: `npx prisma migrate dev`
3. Seed test data: `npm run seed:test` (for test environment)
4. Start server: `npm run dev` (development) or `npm start` (production)

Server runs on `http://localhost:3000`

## Testing

- `npm test` - Run tests with automatic database reset and seeding
- `npm run test:setup` - Reset and seed test database only

## Health Check

`GET /health` - Returns `{"ok": true}`