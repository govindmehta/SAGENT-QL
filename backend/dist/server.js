"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const genai_1 = require("@google/genai");
const db_1 = require("./db");
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing from the backend environment');
}
const ai = new genai_1.GoogleGenAI({ apiKey });
const app = (0, express_1.default)();
const port = Number(process.env.PORT ?? 3001);
const startupSales = (0, db_1.executeLocalQuery)('SELECT * FROM sales');
console.log('Startup sales snapshot:', startupSales);
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173',
}));
app.get('/health', (_request, response) => {
    response.json({ ok: true });
});
app.post('/api/chat', async (request, response) => {
    const messages = request.body.messages;
    if (!Array.isArray(messages)) {
        response.status(400).json({ error: 'Request body must be an array of messages.' });
        return;
    }
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: messages,
        });
        response.json({ response: result.text ?? '' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Gemini error';
        response.status(500).json({ error: message });
    }
});
app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
});
