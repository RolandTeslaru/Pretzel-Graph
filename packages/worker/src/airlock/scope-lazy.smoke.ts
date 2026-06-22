import ivm from "isolated-vm";
import { Airlock } from "@pretzel-graph/shared/domain";
import { AirlockScope } from "./AirlockScope";
import { installLazyBootstrap } from "./LazyInput";

// Run: npx tsx packages/worker/src/airlock/scope-lazy.smoke.ts
// Exercises the REAL AirlockScope.executeSync (lazy __in__ routing + rewrite + release)
// with a minimal fake service that just compiles expressions on the shared isolate.

const isolate = new ivm.Isolate({ memoryLimit: 128 });
const context = isolate.createContextSync();
installLazyBootstrap(context);

const fakeService = {
    get isDisposed() { return isolate.isDisposed; },
    compileExpression(expr: Airlock.Source.Expression, coerceTo?: Airlock.CoerceTo) {
        return isolate.compileScriptSync(Airlock.parseExpression(expr, coerceTo));
    },
};

const scope = new AirlockScope(fakeService as never, context, 5_000);

const incoming = { port1: { data: { value: 42, flag: false }, items: [{ v: 1 }, { v: 2 }, { v: 3 }] } };

let pass = 0, fail = 0;
const check = (label: string, expr: string, expected: unknown, coerce?: Airlock.CoerceTo) => {
    const got = scope.executeSync(
        { [Airlock.GLOBALS.in]: incoming },
        (evaluate) => evaluate(Airlock.Source.asExpression(expr), coerce),
    );
    const ok = JSON.stringify(got) === JSON.stringify(expected);
    console.log(`  ${ok ? "✓" : "✗"} ${label.padEnd(26)} ${JSON.stringify(got)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
    ok ? pass++ : fail++;
};

console.log("AirlockScope.executeSync (lazy $in):");
check("leaf value", "$in.port1.data.value", 42);
check("boolean coerce", "$in.port1.data.flag", false, "boolean");
check("falsy flag in ternary", "$in.port1.data.flag ? 'Y' : 'N'", "N");
check("strict eq", "$in.port1.data.flag === false", true);
check("missing -> undefined", "$in.port1.nope === undefined", true);
check("array length", "$in.port1.items.length", 3);
check("array sum (iterator)", "$in.port1.items.reduce((s,x)=>s+x.v,0)", 6);
check("number coerce", "$in.port1.data.value", 42, "number");
check("string coerce", "$in.port1.data.value", "42", "string");

// Re-fire on the same scope (reused context) must rebind cleanly and not leak the prior $in.
const incoming2 = { port1: { data: { value: 99, flag: true } } } as typeof incoming;
const refire = scope.executeSync(
    { [Airlock.GLOBALS.in]: incoming2 },
    (evaluate) => evaluate(Airlock.Source.asExpression("$in.port1.data.value")),
);
console.log(`  ${refire === 99 ? "✓" : "✗"} re-fire rebinds $in        ${refire}`);
refire === 99 ? pass++ : fail++;

// After the block, $in must be gone (binding released).
const leaked = context.evalSync(`typeof ${Airlock.GLOBALS.in}`);
console.log(`  ${leaked === "undefined" ? "✓" : "✗"} $in released after block   ${leaked}`);
leaked === "undefined" ? pass++ : fail++;

isolate.dispose();
console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"}: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
