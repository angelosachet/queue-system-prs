# SimQueue - Queue Management System

A comprehensive queue management system for simulators with timed turns, player management, and AC Launcher integration.

## Features

- **Player Management** - Create, update, delete players with contact information
- **Simulator Management** - Manage multiple simulators with PC IP configuration
- **Queue System** - Add players to queues, manage positions with custom time and payment
- **Timed Queues** - Automatic turn management with timeouts and confirmation windows
- **AC Launcher Integration** - Direct integration with Assetto Corsa Competizione launcher
- **WebSocket Communication** - Real-time communication with AC Launcher instances
- **Session Management** - Track and manage AC racing sessions automatically
- **Error Handling & Reconnection** - Robust error handling with automatic reconnection
- **Authentication System** - Role-based access control (Master, Admin, Seller, Player)
- **QR Code System** - Seller referral system with QR codes
- **Real-time Events** - WebSocket-based event system for queue changes

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
- `POST /queue` - Add player to queue (with optional timeMinutes and amountPaid)
- `GET /queue` - List all queues
- `GET /queue/:simulatorId` - Get queue for simulator
- `DELETE /queue/:queueId` - Remove player from queue
- `PUT /queue/:queueId/move` - Move player position

#### Add Player to Queue Body:
```json
{
  "playerId": 1,
  "simulatorId": 1,
  "timeMinutes": 10,  // Optional: defaults to 5 minutes
  "amountPaid": 25.50 // Optional: defaults to 0
}
```

### Timed Queue
- `POST /timed-queue/simulator/:simulatorId/start` - Start timed queue
- `GET /timed-queue/simulator/:simulatorId/status` - Get queue status
- `POST /timed-queue/simulator/:simulatorId/next` - Process next player
- `POST /timed-queue/:queueId/confirm` - Confirm player turn
- `POST /timed-queue/:queueId/missed` - Handle missed confirmation

### AC Launcher Integration
- `GET /ac-launcher/status/:pcIp` - Get AC Launcher connection status
- `POST /ac-launcher/session` - Create/start AC session
- `GET /ac-launcher/sessions` - List all AC sessions
- `GET /ac-launcher/sessions/:sessionId` - Get specific AC session
- `PUT /ac-launcher/sessions/:sessionId` - Update AC session status
- `DELETE /ac-launcher/sessions/:sessionId` - Delete AC session
- `POST /ac-launcher/reconnect` - Force reconnection to AC Launcher
- `GET /ac-launcher/connection-stats` - Get connection statistics
- `GET /ac-launcher/config` - Get AC Launcher configuration
- `PUT /ac-launcher/config` - Update AC Launcher configuration

### Authentication System
- `POST /auth/register` - Register new user (Player, Seller, Admin, Master)
- `POST /auth/login` - User login
- `GET /auth/profile` - Get user profile (requires authentication)
- `GET /auth/sellers` - List all sellers
- `POST /auth/create-master` - Create master user (requires master key)

### Time Patterns
- `GET /time-patterns` - List all time patterns
- `POST /time-patterns` - Create time pattern
- `GET /time-patterns/:id` - Get time pattern by ID
- `PUT /time-patterns/:id` - Update time pattern
- `DELETE /time-patterns/:id` - Delete time pattern

### QR Code System
- `GET /sellers/:sellerId/qrcode` - Generate QR code for seller referral
- `GET /sellers/:sellerId/referrals` - List seller's referrals

## Queue States

- **WAITING** - Player waiting in queue
- **ACTIVE** - Player's turn started, awaiting confirmation (3 min window)
- **CONFIRMED** - Player confirmed, turn in progress (5 min duration)
- **MISSED** - Player missed their confirmation window
- **COMPLETED** - Player finished their turn

## AC Launcher Integration

### WebSocket Communication
- **AC Launcher Port**: 8090 (default)
- **WebSocket Protocol**: Real-time bidirectional communication
- **Automatic Reconnection**: 5 attempts with exponential backoff (5s, 10s, 15s, 20s, 25s)
- **Error Handling**: Comprehensive error logging and recovery
- **Connection Monitoring**: Real-time status tracking and statistics

### Session Management
- **Automatic Session Creation**: Sessions created on player confirmation
- **Real-time Tracking**: Monitor session status and progress
- **Configuration Support**: Car models, tracks, session types, time limits
- **Status Updates**: PENDING → ACTIVE → COMPLETED/FAILED

### Supported Features
- **Car Selection**: Multiple car models supported
- **Track Configuration**: Various track layouts
- **Session Types**: Practice, Qualifying, Race
- **Time Limits**: Configurable session duration
- **Player Names**: Real player names in AC sessions

## Configuration

- **Default Turn Duration**: 5 minutes (customizable per player)
- **Confirmation Window**: 3 minutes
- **Custom Time Range**: Any positive number of minutes
- **Payment Tracking**: Decimal values supported
- **AC Launcher Reconnection**: 5 attempts with exponential backoff
- **WebSocket Timeout**: 10 seconds connection timeout

## Queue Flow

1. **Start Queue** - First player becomes ACTIVE with 3-minute confirmation window
2. **Confirm Turn** - Player becomes CONFIRMED with 5-minute turn timer
3. **Turn Completion** - Player is removed, next player automatically becomes ACTIVE
4. **Missed Confirmation** - Player moved to end of queue, next player becomes ACTIVE

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- AC Launcher (for AC integration)

### Environment Variables
Create a `.env` file with:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/queue_system"
DATABASE_URL_TEST="postgresql://user:password@localhost:5433/queue_system_test"
JWT_SECRET="your-jwt-secret-key"
MASTER_CREATION_KEY="your-master-key"
WS_PORT=8080
```

### Development
1. Install dependencies: `npm install`
2. Setup database: `npx prisma migrate dev`
3. Seed test data: `npm run seed:test` (for test environment)
4. Start server: `npm run dev` (development) or `npm start` (production)

### AC Launcher Setup
1. Install and configure AC Launcher on target PCs
2. Ensure AC Launcher WebSocket server is running on port 8090
3. Configure PC IP addresses in simulator settings
4. Test connection using `/ac-launcher/status/:pcIp` endpoint

### Docker Deployment

#### Development
```bash
cd docker/dev
docker-compose up -d
```

#### Production
```bash
export POSTGRES_PASSWORD=your_secure_password
export JWT_SECRET=your_jwt_secret

cd docker/prod
docker-compose up -d
```

### WebSocket Configuration
- **Backend WebSocket**: `ws://localhost:8080`
- **HTTP Server**: `http://localhost:3000`
- **AC Launcher WebSocket**: `ws://[PC_IP]:8090`

Server runs on `http://localhost:3000`
WebSocket server runs on `ws://localhost:8080`

## User Roles & Permissions

- **MASTER** - Full system access, can create admins
- **ADMIN** - Manage simulators, queues, and users
- **SELLER** - Create players, manage referrals, generate QR codes
- **PLAYER** - Join queues, participate in sessions

## Testing

- `npm test` - Run all tests with automatic database reset and seeding
- `npm run test:auth` - Run authentication tests
- `npm run test:roles` - Run user roles tests
- `npm run test:setup` - Reset and seed test database only

## API Documentation

### Error Responses
All endpoints return consistent error format:
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

### Success Responses
All endpoints return consistent success format:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* Response data */ }
}
```

## Health Check

`GET /health` - Returns `{"ok": true}`

## WebSocket Events

- `QUEUE_UPDATE` - Queue changes (add/remove/move players)
- `TIMED_QUEUE_UPDATE` - Timed queue status changes
- `PLAYER_UPDATE` - Player information updates
- `AC_SESSION_UPDATE` - AC session status changes