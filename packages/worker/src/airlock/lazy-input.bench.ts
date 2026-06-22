import ivm from "isolated-vm";
import { installLazyBootstrap, bindLazyGlobal } from "./LazyInput";

// Run: npx tsx packages/worker/src/airlock/lazy-input.bench.ts

const ITEMS = 50_000;

function buildPayload() {
    return {
        meta: { owner: { name: "alice", flags: { admin: false, beta: true } }, version: 7 },
        items: Array.from({ length: ITEMS }, (_, i) => ({ id: i, value: i % 100, tag: "row-" + i })),
    };
}

function heapMB(iso: ivm.Isolate): number {
    return iso.getHeapStatisticsSync().used_heap_size / 1024 / 1024;
}

function time(label: string, fn: () => void) {
    const t = performance.now();
    fn();
    console.log(`${label.padEnd(34)} ${(performance.now() - t).toFixed(2)} ms`);
}

function bench() {
    const payload = buildPayload();
    const payloadMB = Buffer.byteLength(JSON.stringify(payload)) / 1024 / 1024;
    console.log(`payload ≈ ${payloadMB.toFixed(1)} MB JSON, ${ITEMS} items\n`);

    // ── copy:true approach ──────────────────────────────────────────────
    {
        const iso = new ivm.Isolate({ memoryLimit: 256 });
        const ctx = iso.createContextSync();
        const base = heapMB(iso);
        time("copy: setSync(copy:true)", () => ctx.global.setSync("inCopy", payload, { copy: true }));
        console.log(`copy: isolate heap +${(heapMB(iso) - base).toFixed(1)} MB`);
        time("copy: 10k sparse leaf reads", () => {
            ctx.evalSync(`{ let x; for (let i=0;i<10000;i++){ x = inCopy.meta.owner.flags.beta; } x }`);
        });
        time("copy: sum over items loop", () => {
            ctx.evalSync(`{ let s=0; for (const it of inCopy.items) s += it.value; s }`);
        });
        console.log(`copy: if(beta) -> ${ctx.evalSync(`inCopy.meta.owner.flags.beta ? "T":"F"`)},  if(admin) -> ${ctx.evalSync(`inCopy.meta.owner.flags.admin ? "T":"F"`)}`);
        iso.dispose();
    }

    console.log("");

    // ── lazy bridge approach ────────────────────────────────────────────
    {
        const iso = new ivm.Isolate({ memoryLimit: 256 });
        const ctx = iso.createContextSync();
        installLazyBootstrap(ctx);
        const base = heapMB(iso);
        let binding!: ReturnType<typeof bindLazyGlobal>;
        time("lazy: bindLazyGlobal", () => { binding = bindLazyGlobal(ctx, "$in", payload); });
        console.log(`lazy: isolate heap +${(heapMB(iso) - base).toFixed(1)} MB`);
        time("lazy: 10k sparse leaf reads", () => {
            ctx.evalSync(`{ let x; for (let i=0;i<10000;i++){ x = $in.meta.owner.flags.beta; } x }`);
        });
        time("lazy: sum over items loop (iterator)", () => {
            ctx.evalSync(`{ let s=0; for (const it of $in.items) s += it.value; s }`);
        });
        time("lazy: sum over items loop (index)", () => {
            ctx.evalSync(`{ let s=0; for (let i=0;i<$in.items.length;i++) s += $in.items[i].value; s }`);
        });

        console.log("\n  -- correctness --");
        const ok = (label: string, expr: string, expected: string) => {
            const got = String(ctx.evalSync(expr));
            console.log(`  ${got === expected ? "✓" : "✗"} ${label.padEnd(28)} ${got}${got === expected ? "" : ` (expected ${expected})`}`);
        };
        ok("if(beta)", `$in.meta.owner.flags.beta ? "T":"F"`, "T");
        ok("if(admin)", `$in.meta.owner.flags.admin ? "T":"F"`, "F");
        ok("typeof beta", `typeof $in.meta.owner.flags.beta`, "boolean");
        ok("admin === false", `$in.meta.owner.flags.admin === false`, "true");
        ok("items.length", `$in.items.length`, String(ITEMS));
        ok("missing path", `$in.nope === undefined`, "true");
        ok("spread leaf count", `Object.keys({...$in.meta.owner.flags}).length`, "2");
        ok("return whole subtree", `JSON.stringify($in.meta.owner.flags)`, `{"admin":false,"beta":true}`);
        ok("nested leaf reads", `$in.meta.owner.name + ":" + $in.meta.version`, "alice:7");

        binding.release();
        // after release the global is gone
        ok("released ($in undefined)", `typeof $in`, "undefined");
        iso.dispose();
    }
}

bench();
