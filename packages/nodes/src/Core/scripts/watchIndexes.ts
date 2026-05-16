import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

const TARGET_DIR   = path.resolve(__dirname, '../../..');
const GENERATE_SCRIPT = path.resolve(__dirname, './generateIndexes.ts');

let timer: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 1000;

function runGeneration() {
    console.log('\n[watchIndexes] Change detected, generating indexes...');

    const child = spawn('tsx', [GENERATE_SCRIPT], {
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
        if (filename && !filename.endsWith('.ts')) return;

        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            runGeneration();
        }, DEBOUNCE_MS);
    });
} catch (error) {
    console.error("Error setting up watcher:", error);
}

// Initial run
runGeneration();
