import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
    // rawBody: true preserves the original request bytes for HMAC signature verification
    const app = await NestFactory.create(AppModule, { rawBody: true });

    const PORT = process.env.WEBHOOK_PORT || 3002;

    app.setGlobalPrefix('webhooks');

    await app.listen(PORT);
    console.log(`Webhook server running on http://localhost:${PORT}`);
}

bootstrap();
