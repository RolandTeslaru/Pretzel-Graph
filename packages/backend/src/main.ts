import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const PORT = process.env.PORT || 3001;

    app.enableCors({
        origin: '*', // Allows all origins, you can restrict this to your frontend URL later
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
