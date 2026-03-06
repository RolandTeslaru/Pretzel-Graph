"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const ws_1 = require("ws");
const ioredis_1 = __importDefault(require("ioredis"));
const constants_1 = require("@vx-agent-editor/shared/constants");
let RealtimeGateway = class RealtimeGateway {
    constructor() {
        this.redisSub = new ioredis_1.default({ host: constants_1.REDIS_HOST, port: constants_1.REDIS_PORT });
        this.subscriptions = new Map();
        this.redisSub.psubscribe('*', (err) => {
            if (err)
                console.error('Redis psubscribe error', err);
        });
        this.redisSub.on('pmessage', (pattern, topic, serializedEvent) => {
            const clients = this.subscriptions.get(topic);
            if (clients) {
                clients.forEach(ws => {
                    if (ws.readyState === ws_1.WebSocket.OPEN) {
                        ws.send(serializedEvent);
                    }
                });
            }
        });
    }
    handleConnection(ws) {
        console.log('WebSocket client connected');
        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.action === "subscribe")
                    this.subscribe(ws, msg.topic);
                if (msg.action === "unsubscribe")
                    this.unsubscribe(ws, msg.topic);
            }
            catch (err) {
                console.error('Invalid WS message:', err);
            }
        });
        ws.on('close', () => this.handleDisconnect(ws));
    }
    handleDisconnect(ws) {
        this.subscriptions.forEach((clients, topicId) => {
            clients.delete(ws);
            if (clients.size === 0) {
                this.subscriptions.delete(topicId);
            }
        });
    }
    subscribe(ws, topic) {
        if (!this.subscriptions.has(topic)) {
            this.subscriptions.set(topic, new Set());
        }
        this.subscriptions.get(topic).add(ws);
    }
    unsubscribe(ws, topic) {
        this.subscriptions.get(topic)?.delete(ws);
    }
};
exports.RealtimeGateway = RealtimeGateway;
exports.RealtimeGateway = RealtimeGateway = __decorate([
    (0, websockets_1.WebSocketGateway)(),
    __metadata("design:paramtypes", [])
], RealtimeGateway);
