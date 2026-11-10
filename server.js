// HEIST API server. Start it with `npm start`.
import cors from 'cors';
import express from 'express';
import { missingConfig } from './heist.js';
import routes from './routes.js';

const app = express();
app.set('trust proxy', true); // so req.ip is the user's real IP behind a host like Render or Railway
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json({ limit: '20kb' }));
app.use(routes);

// Any error (e.g. a body that isn't valid JSON) comes back as JSON, never an HTML stack trace.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Body must be valid JSON', code: 'BAD_JSON' });
  res.status(err.status ?? 500).json({ error: err.message, code: 'SERVER_ERROR' });
});

const PORT = Number(process.env.PORT ?? 8080);
app.listen(PORT, () => {
  console.log(`Heist API on http://localhost:${PORT}`);
  if (missingConfig().length) console.log(`! Fill these in .env: ${missingConfig().join(', ')}`);
});
