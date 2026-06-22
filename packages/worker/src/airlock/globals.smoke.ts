import ivm from "isolated-vm";
import { Airlock } from "@pretzel-graph/shared/domain";
import { AirlockScope } from "./AirlockScope";
import { installLazyBootstrap } from "./LazyInput";

// Run: npx tsx packages/worker/src/airlock/globals.smoke.ts
// Verifies $globals / $nodeGlobals: execution-scoped, mutable, persist across re-fires,
// per-node isolation, usable from the real AirlockScope.executeSync path.

const isolate = new ivm.Isolate({ memoryLimit: 128 });
const context = isolate.createContextSync();
installLazyBootstrap(context);
// mimic AirlockService.createScope
context.global.setSync(Airlock.GLOBALS.globals, {}, { copy: true });
context.global.setSync(Airlock.GLOBALS.workflow, {
    nodes: { A: { id: "A" }, B: { id: "B" }, C: { id: "C" }, amt6b: { id: "amt6b" } },
}, { copy: true });

const fakeService = {
    get isDisposed() { return isolate.isDisposed; },
    compileExpression(expr: Airlock.Source.Expression, coerceTo?: Airlock.CoerceTo) {
        return isolate.compileScriptSync(Airlock.parseExpression(expr, coerceTo));
    },
};
const scope = new AirlockScope(fakeService as never, context, 5_000);

// eval an expression as a given node id (sets __node_id__ for $nodeGlobals)
const evalAs = (nodeId: string, expr: string, incoming: unknown = {}) =>
    scope.executeSync(
        { [Airlock.GLOBALS.in]: incoming, [Airlock.GLOBALS.nodeId]: nodeId },
        (evaluate) => evaluate(Airlock.Source.asExpression(expr)),
    );

let pass = 0, fail = 0;
const ok = (label: string, got: unknown, expected: unknown) => {
    const good = JSON.stringify(got) === JSON.stringify(expected);
    console.log(`  ${good ? "✓" : "✗"} ${label.padEnd(34)} ${JSON.stringify(got)}${good ? "" : ` (expected ${JSON.stringify(expected)})`}`);
    good ? pass++ : fail++;
};

console.log("$globals / $nodeGlobals:");

// write then read back in a *separate* evaluation → persists across re-fires
evalAs("A", `$globals.counter = 1`);
ok("$globals persists across evals", evalAs("A", `$globals.counter`), 1);

// $nodeGlobals auto-buckets and is keyed by node id
evalAs("A", `$nodeGlobals.hits = 10`);
evalAs("B", `$nodeGlobals.hits = 99`);
ok("$nodeGlobals[A] isolated", evalAs("A", `$nodeGlobals.hits`), 10);
ok("$nodeGlobals[B] isolated", evalAs("B", `$nodeGlobals.hits`), 99);
ok("$nodeGlobals is $globals[id]", evalAs("A", `$globals[$node.id].hits`), 10);

// undefined-safe: reading an unset bucket/key doesn't throw
ok("unset $nodeGlobals key", evalAs("C", `$nodeGlobals.nope ?? "default"`), "default");

console.log("\ncompaction latch (token-based, side-effecting condition):");
const COND = `(() => {
    const THRESHOLD = 10;
    const g = $nodeGlobals;
    for (let i = $in.input.length - 1; i >= 0; i--) {
        const msg = $in.input[i];
        if (msg && msg.type === "ai") {
            const tokens = msg.usage_metadata?.total_tokens ?? 0;
            if (tokens > THRESHOLD && g.lastCompactedTokens !== tokens) {
                g.lastCompactedTokens = tokens;
                return true;
            }
            break;
        }
    }
    return false;
})()`;

// turn 1: big ai message (tokens 50) → compact once, then re-fire sees same stale tokens → stop
const stateBig = { input: [{ type: "human" }, { type: "ai", usage_metadata: { total_tokens: 50 } }] };
ok("first fire compacts", evalAs("amt6b", COND, stateBig), true);
ok("re-fire (stale 50) no loop", evalAs("amt6b", COND, stateBig), false);
ok("re-fire again still false", evalAs("amt6b", COND, stateBig), false);

// later in the run: a NEW ai message with different token count → compacts again
const stateNew = { input: [{ type: "ai", usage_metadata: { total_tokens: 50 } }, { type: "ai", usage_metadata: { total_tokens: 80 } }] };
ok("new measurement compacts", evalAs("amt6b", COND, stateNew), true);
ok("then latches at 80", evalAs("amt6b", COND, stateNew), false);

// under threshold → never compacts
const stateSmall = { input: [{ type: "ai", usage_metadata: { total_tokens: 3 } }] };
ok("under threshold", evalAs("amt6b", COND, stateSmall), false);

isolate.dispose();
console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"}: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
