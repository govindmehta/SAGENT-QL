"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const express_1 = __importDefault(require("express"));
const genai_1 = require("@google/genai");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
const excelScanner_1 = require("./excelScanner");
const executeSqlTool = {
    name: 'executeLocalSql',
    description: 'Executes a raw read or write SQL query against the local SQLite database. Use this anytime the user asks to view, insert, modify, or analyze database information.',
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
};
const scanSpreadsheetTool = {
    name: 'scanSpreadsheetFile',
    description: 'Scans an Excel spreadsheet (.xlsx) or CSV file at a local path. Returns sheet names, column headers, and sample row data so you can understand its schema before writing insert statements.',
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
};
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing from the backend environment');
}
const ai = new genai_1.GoogleGenAI({ apiKey });
const app = (0, express_1.default)();
const port = Number(process.env.PORT ?? 3001);
const uploadsDir = path_1.default.resolve(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
const uploadStorage = multer_1.default.diskStorage({
    destination: (_request, _file, callback) => {
        callback(null, uploadsDir);
    },
    filename: (_request, file, callback) => {
        callback(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = (0, multer_1.default)({ storage: uploadStorage });
const startupSales = (0, db_1.executeLocalQuery)('SELECT * FROM sales');
console.log('Startup sales snapshot:', startupSales);
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173',
}));
app.get('/health', (_request, response) => {
    response.json({ ok: true });
});
app.post('/api/upload', upload.single('file'), (request, response) => {
    const file = request.file;
    if (!file) {
        response.status(400).json({ error: 'No file was provided.' });
        return;
    }
    response.json({
        success: true,
        filePath: `./uploads/${file.filename}`,
        originalName: file.originalname,
    });
});
function createModelTurn(functionCalls) {
    return {
        role: 'model',
        parts: functionCalls.map((functionCall) => ({ functionCall })),
    };
}
function isSupportedFunctionCall(functionCall) {
    return functionCall.name === executeSqlTool.name || functionCall.name === scanSpreadsheetTool.name;
}
function isRateLimitError(error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = typeof error?.status === 'number' ? error.status : undefined;
    const code = typeof error?.code === 'number' ? error.code : undefined;
    return (status === 429 ||
        code === 429 ||
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('429'));
}
function formatAttachmentContext(attachment, scanResult) {
    if (!scanResult || typeof scanResult !== 'object') {
        return '';
    }
    const result = scanResult;
    if (result.error) {
        throw new Error(result.error);
    }
    const schemaText = [
        `Sheet name: ${result.sheetName ?? 'Unknown'}`,
        `Columns: ${(result.headers ?? []).join(', ') || 'None found'}`,
        `Total rows: ${result.totalRowCount ?? 0}`,
        `Sample rows: ${JSON.stringify(result.sampleRows ?? [], null, 2)}`,
    ].join(' | ');
    return `[CONTEXT: The user has attached a file named "${attachment.name}" located locally at "${attachment.path}". Its structural schema is: ${schemaText}]`;
}
async function createToolResponseTurn(functionCalls) {
    const parts = await Promise.all(functionCalls.map(async (functionCall) => {
        let executionResult;
        switch (functionCall.name) {
            case executeSqlTool.name: {
                const query = typeof functionCall.args?.query === 'string' ? functionCall.args.query : '';
                const sqlResult = (0, db_1.executeLocalQuery)(query);
                const isErrorMessage = typeof sqlResult === 'string' && !sqlResult.startsWith('Rows modified: ');
                executionResult = isErrorMessage ? { error: sqlResult } : { output: sqlResult };
                break;
            }
            case scanSpreadsheetTool.name: {
                const filePath = typeof functionCall.args?.filePath === 'string' ? functionCall.args.filePath : '';
                executionResult = await (0, excelScanner_1.scanLocalWorkbook)(filePath);
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
                response: executionResult,
            },
        };
    }));
    return {
        role: 'user',
        parts,
    };
}
async function generateChatResponse(contents) {
    try {
        return await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: "You are an analytical local database agent. You have access to a local SQLite database with tables like 'sales'. Do not invent column or table names; always use correct SQL syntax. If an operation fails, you will receive the raw error message to help you self-correct. ALWAYS format SQL query outputs and spreadsheet summaries using clean Markdown tables instead of raw JSON blocks.",
                tools: [
                    {
                        functionDeclarations: [executeSqlTool],
                    },
                    {
                        functionDeclarations: [scanSpreadsheetTool],
                    },
                ],
            },
        });
    }
    catch (error) {
        if (isRateLimitError(error)) {
            const rateLimitError = new Error("Rate limit exceeded. You've used up your free Gemini API daily quota. Please try again later.");
            rateLimitError.status = 429;
            throw rateLimitError;
        }
        throw error;
    }
}
app.post('/api/chat', async (request, response) => {
    const { message, sessionId, attachment } = request.body;
    const activeSessionId = typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : 'default-session';
    const userMessageText = typeof message === 'string' ? message.trim() : '';
    if (!userMessageText) {
        response.status(400).json({ error: 'Request body must include a message string.' });
        return;
    }
    try {
        const chatHistory = (0, db_1.getChatHistory)(activeSessionId);
        (0, db_1.saveMessage)(activeSessionId, 'user', userMessageText);
        let contextualizedUserText = userMessageText;
        if (attachment?.path) {
            const scanResult = await (0, excelScanner_1.scanLocalWorkbook)(attachment.path);
            const attachmentContext = formatAttachmentContext(attachment, scanResult);
            if (attachmentContext) {
                contextualizedUserText = `${attachmentContext}\n\n${userMessageText}`;
            }
        }
        const compiledContents = [
            ...chatHistory,
            {
                role: 'user',
                parts: [{ text: contextualizedUserText }],
            },
        ];
        const initialResponse = await generateChatResponse(compiledContents);
        const functionCalls = initialResponse.functionCalls ?? [];
        const supportedFunctionCalls = functionCalls.filter(isSupportedFunctionCall);
        if (supportedFunctionCalls.length === 0) {
            const finalText = initialResponse.text ?? '';
            if (finalText) {
                (0, db_1.saveMessage)(activeSessionId, 'model', finalText);
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
            (0, db_1.saveMessage)(activeSessionId, 'model', finalText);
        }
        response.json({ response: finalText });
    }
    catch (error) {
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
