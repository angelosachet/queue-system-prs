import express from 'express';
import { playerRouter } from './routes/player.routes';
import { simulatorRouter } from './routes/simulator.routes';
import { queueRouter } from './routes/queue.routes';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/players', playerRouter);
app.use('/simulators', simulatorRouter);
app.use('/queue', queueRouter);

export { app };
