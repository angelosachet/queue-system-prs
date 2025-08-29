import express from 'express';
import cors from 'cors';

import { playerRouter } from './routes/player.routes';
import { simulatorRouter } from './routes/simulator.routes';
import { queueRouter } from './routes/queue.routes';
import timedQueueRouter from './controllers/timedQueue.controller';

const app = express();

// Permite qualquer origem (útil para desenvolvimento)
app.use(cors());

// // ou para permitir só o front-end
// app.use(cors({
//   origin: "http://localhost:5173"
// }));

app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/players', playerRouter);
app.use('/simulators', simulatorRouter);
app.use('/queue', queueRouter);
app.use('/timed-queue', timedQueueRouter);

export { app };
