// Must stay first: populates process.env from the repo-root .env before any
// module that reads it at import time is evaluated.
import './load-env';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { runMigrations } from './db/migrator';
import * as express from 'express';
import { WsAdapter } from '@nestjs/platform-ws';
import path from 'path';
import { CatalogueService } from '@pretzel-graph/node-sdk';
import { trustedProxyMiddleware } from './auth/trusted-proxy';

// Compiled runs point NODES_ROOT at the built nodes; the default is the sources
// ts-node reads in development.
CatalogueService.setNodesRoot(
    process.env.NODES_ROOT ?? path.resolve(__dirname, '../../nodes/src'),
);

async function bootstrap() {
    // Before the modules load: some of them read the database on init.
    await runMigrations();

    // rawBody: kept for signature verification, which needs the original bytes.
    const app = await NestFactory.create(AppModule, { rawBody: true });

    // First, so unstamped traffic is refused before anything else runs.
    const trustedProxy = trustedProxyMiddleware();
    if (trustedProxy)
        app.use(trustedProxy);

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
    // The webhook roots are URLs third parties hold, so they sit outside the prefix.
    app.setGlobalPrefix('api', { exclude: ['webhook/{*rest}', 'webhook-test/{*rest}', 'health'] });

    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Use WS adapter instead of socket.io since backend originally used 'ws'
    app.useWebSocketAdapter(new WsAdapter(app));

    // Fails the boot rather than serving a route whose path names a resource it never checks.

    await app.listen(PORT);
    console.log(`NestJS server is running on http://localhost:${PORT}`);
    console.log(`WebSocket server initialized`);
}

bootstrap().catch((error: unknown) => {
    console.error('Boot failed:', error instanceof Error ? error.message : error);
    process.exit(1);
});
