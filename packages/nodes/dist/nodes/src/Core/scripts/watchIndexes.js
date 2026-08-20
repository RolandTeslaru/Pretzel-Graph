"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const TARGET_DIR = path.resolve(__dirname, '../../..');
const GENERATE_SCRIPT = path.resolve(__dirname, './generateIndexes.ts');
let timer = null;
const DEBOUNCE_MS = 1000;
function runGeneration() {
    console.log('\n[watchIndexes] Change detected, generating indexes...');
    const child = (0, child_process_1.spawn)('tsx', [GENERATE_SCRIPT], {
        stdio: 'inherit',
        env: process.env,
    });
    child.on('exit', (code) => {
        if (code === 0)
            console.log('[watchIndexes] Indexes updated!');
        else
            console.error(`[watchIndexes] Index generation failed (exit ${code})`);
    });
}
console.log(`Watching for changes in ${TARGET_DIR}...`);
try {
    fs.watch(TARGET_DIR, { recursive: true }, (_eventType, filename) => {
        if (filename && !filename.endsWith('.ts'))
            return;
        if (timer)
            clearTimeout(timer);
        timer = setTimeout(() => {
            runGeneration();
        }, DEBOUNCE_MS);
    });
}
catch (error) {
    console.error("Error setting up watcher:", error);
}
// Initial run
runGeneration();
