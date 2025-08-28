import express from 'express';
import { playerRouter } from './routes/player.routes';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/players', playerRouter);

export { app };
