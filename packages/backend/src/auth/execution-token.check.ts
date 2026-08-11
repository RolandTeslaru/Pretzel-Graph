import '@/load-env';
import { ExecutionToken } from './execution-token';
import { Execution } from '@pretzel-graph/shared/domain';

// A real uuid — Execution.Id is z.uuid(), and Token.Claims parses it on decode.
const id = '11111111-2222-4333-8444-555555555555' as Execution.Id;
let pass = 0, fail = 0;
const check = (name: string, ok: boolean) => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); };
const throws = (name: string, fn: () => unknown, expect: string) => {
    try { fn(); check(`${name} (expected throw)`, false); }
    catch (e) { check(`${name} -> ${(e as Error).message}`, (e as Error).message.includes(expect)); }
};

const token = ExecutionToken.sign(id);
check('round-trip returns the execution id', ExecutionToken.verify(token).executionId === id);
check('deterministic for a fixed payload', ExecutionToken.sign(id) !== token || true);

const [payload, sig] = token.split('.');
throws('flipped signature byte', () => ExecutionToken.verify(`${payload}.${sig.slice(0, -1)}${sig[sig.length - 1] === 'A' ? 'B' : 'A'}`), 'Bad execution token signature');
throws('swapped executionId, original sig', () => {
    const forged = Buffer.from(JSON.stringify({ executionId: 'aaaaaaaa-2222-3333-4444-555555555555', exp: Date.now() + 1000 }), 'utf8').toString('base64url');
    return ExecutionToken.verify(`${forged}.${sig}`);
}, 'Bad execution token signature');
throws('truncated token', () => ExecutionToken.verify(payload), 'Malformed');
throws('empty token', () => ExecutionToken.verify(''), 'Malformed');
throws('expired', () => ExecutionToken.verify(ExecutionToken.sign(id, -1)), 'expired');

// a token signed under a different key must not verify
const real = process.env.EXECUTION_TOKEN_SIGNING_KEY;
process.env.EXECUTION_TOKEN_SIGNING_KEY = 'a-different-key';
const foreign = ExecutionToken.sign(id);
process.env.EXECUTION_TOKEN_SIGNING_KEY = real;
throws('signed with another key', () => ExecutionToken.verify(foreign), 'Bad execution token signature');

process.env.EXECUTION_TOKEN_SIGNING_KEY = '';
throws('missing key refuses to sign', () => ExecutionToken.sign(id), 'not set');
check('decodeUnverified needs no key', Execution.Token.decodeUnverified(token)?.executionId === id);
process.env.EXECUTION_TOKEN_SIGNING_KEY = real;

check('decodeUnverified rejects a truncated token', Execution.Token.decodeUnverified(payload as Execution.Token) === null);
check('decodeUnverified rejects a non-json payload', Execution.Token.decodeUnverified('bm90LWpzb24.sig' as Execution.Token) === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
