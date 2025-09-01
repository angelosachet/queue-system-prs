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
- **ACTIVE** - Player's turn started, awaiting confirmation
- **CONFIRMED** - Player confirmed, turn in progress

## Configuration

- **Turn Duration**: 5 minutes
- **Confirmation Window**: 3 minutes

## Setup

1. Install dependencies: `npm install`
2. Setup database with Prisma
3. Start server: `npm start`

Server runs on `http://localhost:3000`

## Health Check

`GET /health` - Returns `{"ok": true}`