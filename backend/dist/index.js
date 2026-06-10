"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = Number(process.env.PORT ?? 4000);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
