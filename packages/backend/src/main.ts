// Must stay first: populates process.env from the repo-root .env before any
// module that reads it at import time is evaluated.
import './load-env';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { WsAdapter } from '@nestjs/platform-ws';
import path from 'path';
import { CatalogueService } from '@pretzel-graph/node-sdk';

CatalogueService.setNodesRoot(path.resolve(__dirname, '../../nodes/src'));

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const PORT = process.env.PORT || 3001;

    // CORS_ORIGIN can be a comma-separated list of allowed origins, e.g. "http://localhost:5173,https://myapp.com"
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
        .split(',')
        .map(o => o.trim());

    app.enableCors({
        origin: allowedOrigins,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });

    // Mount all routes under /api
    app.setGlobalPrefix('api');

    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Use WS adapter instead of socket.io since backend originally used 'ws'
    app.useWebSocketAdapter(new WsAdapter(app));

    await app.listen(PORT);
    console.log(`NestJS server is running on http://localhost:${PORT}`);
    console.log(`WebSocket server initialized`);
}

bootstrap();
