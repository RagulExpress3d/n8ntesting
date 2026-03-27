import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import { translationRouter } from './routes/translationRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
  }),
);

app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/translation', translationRouter);

app.use((err, _req, res, _next) => {
  // Keep API errors explicit for frontend diagnostics.
  console.error(err);
  res.status(500).json({
    error: err?.message || 'Unexpected server error',
  });
});

app.listen(PORT, () => {
  console.log(`CAD localization backend listening on ${PORT}`);
});
