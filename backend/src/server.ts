import 'dotenv/config';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { executeLocalQuery } from './db';

const executeSqlTool = {
  name: 'executeLocalSql',
  description:
    'Executes a raw read or write SQL query against the local SQLite database. Use this anytime the user asks to view, insert, modify, or analyze database information.',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: {
        type: 'STRING',
        description: 'The exact, valid SQLite statement to execute.',
      },
    },
    required: ['query'],
  },
} as const;

type ChatMessage = {
  role?: string;
  parts?: Array<{
    text?: string;
    functionCall?: {
      id?: string;
      name?: string;
      args?: Record<string, unknown>;
    };
    functionResponse?: {
      id?: string;
      name?: string;
      response?: Record<string, unknown>;
    };
  }>;
};

type GeminiFunctionCall = {
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
};

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

function createModelTurn(functionCalls: GeminiFunctionCall[]) {
  return {
    role: 'model',
    parts: functionCalls.map((functionCall) => ({ functionCall })),
  };
}

function createToolResponseTurn(functionCalls: GeminiFunctionCall[]) {
  return {
    role: 'user',
    parts: functionCalls.map((functionCall) => {
      const query = typeof functionCall.args?.query === 'string' ? functionCall.args.query : '';
      const executionResult = executeLocalQuery(query);
      const isErrorMessage =
        typeof executionResult === 'string' && !executionResult.startsWith('Rows modified: ');

      return {
        functionResponse: {
          id: functionCall.id,
          name: functionCall.name,
          response: isErrorMessage
            ? { error: executionResult }
            : { output: executionResult },
        },
      };
    }),
  };
}

async function generateChatResponse(contents: ChatMessage[]) {
  return ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contents as any,
    config: {
      systemInstruction:
        "You are an analytical local database agent. You have access to a local SQLite database with tables like 'sales'. Do not invent column or table names; always use correct SQL syntax. If an operation fails, you will receive the raw error message to help you self-correct.",
      tools: [
        {
          functionDeclarations: [executeSqlTool],
        },
      ],
    } as any,
  });
}

app.post('/api/chat', async (request: Request, response: Response) => {
  const messages = request.body.messages;

  if (!Array.isArray(messages)) {
    response.status(400).json({ error: 'Request body must include a messages array.' });
    return;
  }

  try {
    const initialResponse = await generateChatResponse(messages as ChatMessage[]);
    const functionCalls = initialResponse.functionCalls ?? [];
    const sqlFunctionCalls = functionCalls.filter(
      (functionCall) => functionCall.name === executeSqlTool.name
    );

    if (sqlFunctionCalls.length === 0) {
      response.json({ response: initialResponse.text ?? '' });
      return;
    }

    const updatedHistory = [
      ...(messages as ChatMessage[]),
      createModelTurn(functionCalls),
      createToolResponseTurn(sqlFunctionCalls),
    ];

    const finalResponse = await generateChatResponse(updatedHistory);
    response.json({ response: finalResponse.text ?? '' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Gemini error';
    response.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
