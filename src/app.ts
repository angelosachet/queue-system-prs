import express from 'express';
import cors from 'cors';

import { playerRouter } from './routes/player.routes';
import { simulatorRouter } from './routes/simulator.routes';
import { queueRouter } from './routes/queue.routes';
import { timedQueueRouter } from './routes/timed-queue.routes';
import { authRouter } from './routes/auth.routes';
import { qrcodeRoutes } from './routes/qrcode.routes';
import { timePatternRouter } from './routes/timePattern.routes';

const app = express();

// Allow any origin (useful for development)
app.use(cors());

// // or to allow only the front-end
// app.use(cors({
//   origin: "http://localhost:5173"
// }));

app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth', authRouter);
app.use('/players', playerRouter);
app.use('/simulators', simulatorRouter);
app.use('/queue', queueRouter);
app.use('/timed-queue', timedQueueRouter);
app.use('/time-patterns', timePatternRouter);
app.use('/', qrcodeRoutes);

export { app };
