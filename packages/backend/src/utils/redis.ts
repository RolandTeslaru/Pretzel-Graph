import { Logger } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from '@pretzel-graph/shared/constants';

const logger = new Logger('Redis');

/** ioredis prints the full stack for an error nobody listens to, so every client gets a handler. */
export function createRedisClient(name: string, options: RedisOptions = {}): Redis {
    const client = new Redis({ host: REDIS_HOST, port: REDIS_PORT, ...options });

    client.on('error', (error: Error) => logger.warn(`${name}: ${error.message}`));

    return client;
}

/** The ready check sends INFO, which a connection in subscriber mode may refuse. */
export function createRedisSubscriber(name: string): Redis {
    return createRedisClient(name, { enableReadyCheck: false });
}
