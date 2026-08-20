"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDIS_PORT = exports.REDIS_HOST = void 0;
exports.REDIS_HOST = process.env.REDIS_HOST ?? "localhost";
exports.REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);
