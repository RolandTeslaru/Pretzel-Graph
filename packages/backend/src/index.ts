import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import "reflect-metadata";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001; // Default to 3001 to avoid conflict with Frontend (3000)


app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));



import { LibraryService } from './services/Library/service';
import { OrchestratorService } from './services/Orchestrator/service';
import { ExecutionSessionService } from './services/ExecutionSession/service';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { RealtimeService } from './services/Realtime/service';
import { WorkbenchService } from './services/Workbench/service';
import { ChatService } from './services/Chat/service';
import { ShelfService } from './services/Shelf/service';

app.use('/api/library', LibraryService.routes);
app.use('/api/shelf', ShelfService.routes);
app.use('/api/orchestrator', OrchestratorService.routes);
app.use('/api/execution-session', ExecutionSessionService.routes);
app.use('/api/workbench', WorkbenchService.routes)
app.use('/api/chat', ChatService.routes)

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


const server = createServer(app);
const wss = new WebSocketServer({ server });

RealtimeService.initializeWebSocketServer(wss);

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`WebSocket server initialized`);
});
