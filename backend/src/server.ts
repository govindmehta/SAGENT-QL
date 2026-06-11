import 'dotenv/config';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { executeLocalQuery, getChatHistory, saveMessage } from './db';
import { scanLocalWorkbook } from './excelScanner';

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

const scanSpreadsheetTool = {
  name: 'scanSpreadsheetFile',
  description:
    'Scans an Excel spreadsheet (.xlsx) or CSV file at a local path. Returns sheet names, column headers, and sample row data so you can understand its schema before writing insert statements.',
  parameters: {
    type: 'OBJECT',
    properties: {
      filePath: {
        type: 'STRING',
        description: 'The absolute or relative local path to the spreadsheet file.',
      },
    },
    required: ['filePath'],
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

function isSupportedFunctionCall(functionCall: GeminiFunctionCall) {
  return functionCall.name === executeSqlTool.name || functionCall.name === scanSpreadsheetTool.name;
}

function isRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const status = typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : undefined;
  const code = typeof (error as { code?: unknown })?.code === 'number' ? (error as { code: number }).code : undefined;

  return (
    status === 429 ||
    code === 429 ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('429')
  );
}

async function createToolResponseTurn(functionCalls: GeminiFunctionCall[]) {
  const parts = await Promise.all(
    functionCalls.map(async (functionCall) => {
      let executionResult: unknown;

      switch (functionCall.name) {
        case executeSqlTool.name: {
          const query = typeof functionCall.args?.query === 'string' ? functionCall.args.query : '';
          const sqlResult = executeLocalQuery(query);
          const isErrorMessage =
            typeof sqlResult === 'string' && !sqlResult.startsWith('Rows modified: ');

          executionResult = isErrorMessage ? { error: sqlResult } : { output: sqlResult };
          break;
        }

        case scanSpreadsheetTool.name: {
          const filePath =
            typeof functionCall.args?.filePath === 'string' ? functionCall.args.filePath : '';

          executionResult = await scanLocalWorkbook(filePath);
          break;
        }

        default: {
          executionResult = { error: `Unsupported function call: ${functionCall.name ?? 'unknown'}` };
        }
      }

      return {
        functionResponse: {
          id: functionCall.id,
          name: functionCall.name,
          response: executionResult as Record<string, unknown>,
        },
      };
    })
  );

  return {
    role: 'user',
    parts,
  };
}

async function generateChatResponse(contents: ChatMessage[]) {
  try {
    return await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents as any,
      config: {
        systemInstruction:
          "You are an analytical local database agent. You have access to a local SQLite database with tables like 'sales'. Do not invent column or table names; always use correct SQL syntax. If an operation fails, you will receive the raw error message to help you self-correct. ALWAYS format SQL query outputs and spreadsheet summaries using clean Markdown tables instead of raw JSON blocks.",
        tools: [
          {
            functionDeclarations: [executeSqlTool],
          },
          {
            functionDeclarations: [scanSpreadsheetTool],
          },
        ],
      } as any,
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      const rateLimitError = new Error(
        "Rate limit exceeded. You've used up your free Gemini API daily quota. Please try again later."
      );

      (rateLimitError as Error & { status?: number }).status = 429;
      throw rateLimitError;
    }

    throw error;
  }
}

app.post('/api/chat', async (request: Request, response: Response) => {
  const messages = request.body.messages;
  const sessionId = typeof request.body.sessionId === 'string' && request.body.sessionId.trim()
    ? request.body.sessionId.trim()
    : 'default-session';

  if (!Array.isArray(messages)) {
    response.status(400).json({ error: 'Request body must include a messages array.' });
    return;
  }

  try {
    const chatHistory = getChatHistory(sessionId);
    const incomingMessages = messages as ChatMessage[];
    const currentUserMessage = [...incomingMessages]
      .reverse()
      .find((message) => message.role === 'user' && typeof message.parts?.[0]?.text === 'string');

    if (currentUserMessage?.parts?.[0]?.text) {
      saveMessage(sessionId, 'user', currentUserMessage.parts[0].text);
    }

    const compiledContents = [...chatHistory, ...incomingMessages];

    const initialResponse = await generateChatResponse(compiledContents);
    const functionCalls = initialResponse.functionCalls ?? [];
    const supportedFunctionCalls = functionCalls.filter(isSupportedFunctionCall);

    if (supportedFunctionCalls.length === 0) {
      const finalText = initialResponse.text ?? '';
      if (finalText) {
        saveMessage(sessionId, 'model', finalText);
      }

      response.json({ response: finalText });
      return;
    }

    const updatedHistory = [
      ...compiledContents,
      createModelTurn(functionCalls),
      await createToolResponseTurn(supportedFunctionCalls),
    ];

    const finalResponse = await generateChatResponse(updatedHistory);
    const finalText = finalResponse.text ?? '';

    if (finalText) {
      saveMessage(sessionId, 'model', finalText);
    }

    response.json({ response: finalText });
  } catch (error) {
    if (isRateLimitError(error)) {
      response.status(429).json({
        error: "Rate limit exceeded. You've used up your free Gemini API daily quota. Please try again later.",
      });
      return;
    }

    const message = error instanceof Error ? error.message : 'Unknown Gemini error';
    response.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
