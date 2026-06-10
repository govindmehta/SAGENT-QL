import 'dotenv/config';
import cors from 'cors';
import express from 'express';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ ok: true, service: 'backend' });
});

app.get('/', (_request, response) => {
  response.json({
    message: 'SAGENT-QL backend is running',
    endpoints: ['/health'],
  });
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
