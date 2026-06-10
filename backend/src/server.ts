import 'dotenv/config';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { executeLocalQuery } from './db';

type GeminiMessage = unknown;

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is missing from the backend environment');
}

const ai = new GoogleGenAI({ apiKey });
const app = express();
const port = Number(process.env.PORT ?? 3001);

const startupSales = executeLocalQuery('SELECT * FROM sales');
console.log('Startup sales snapshot:', startupSales);

app.use(express.json());
app.use(
  cors({
    origin: 'http://localhost:5173',
  })
);

app.get('/health', (_request: Request, response: Response) => {
  response.json({ ok: true });
});

app.post('/api/chat', async (request: Request, response: Response) => {
  const messages = request.body.messages as GeminiMessage[];

  if (!Array.isArray(messages)) {
    response.status(400).json({ error: 'Request body must be an array of messages.' });
    return;
  }

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: messages as any,
    });

    response.json({ response: result.text ?? '' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Gemini error';
    response.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});