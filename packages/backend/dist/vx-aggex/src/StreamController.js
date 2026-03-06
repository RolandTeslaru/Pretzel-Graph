"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamController = void 0;
class StreamController {
    constructor() {
        this.register = new Map();
    }
    yieldLlmChunk(nodeId, content) {
        const callbacks = this.register.get(nodeId);
        if (callbacks) {
            callbacks.forEach(cb => cb(content));
        }
    }
    onLlmChunk(nodeId, callback) {
        let callbacks = this.register.get(nodeId);
        if (!callbacks) {
            callbacks = new Set();
            this.register.set(nodeId, callbacks);
        }
        callbacks.add(callback);
    }
    disposeLlmCallbacks(nodeId) {
        this.register.delete(nodeId);
    }
    disposeAll() {
        this.register.clear();
    }
}
exports.StreamController = StreamController;
