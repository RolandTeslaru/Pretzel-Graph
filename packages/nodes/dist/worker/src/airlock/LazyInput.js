"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installLazyBootstrap = installLazyBootstrap;
exports.bindLazyGlobal = bindLazyGlobal;
const isolated_vm_1 = __importDefault(require("isolated-vm"));
// Lazy input bridge: instead of copy:true-ing a whole payload into the isolate heap,
// we keep it on the host and expose a Reference. Navigation builds an immutable path;
// each `get` does a tiny "probe" crossing returning either a real primitive (leaf) or a
// fresh proxy (container). Leaves come back as real values, so `if`, `===`, `typeof` all
// work — no .value(). Bulk transfer happens only on iteration or numeric-index access
// of an array (materialize-once), so index loops don't pay per-element crossings.
const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);
function resolvePath(root, path) {
    let node = root;
    for (const key of path) {
        if (node === null || typeof node !== "object")
            return { found: false, node: undefined };
        if (FORBIDDEN.has(key))
            return { found: false, node: undefined };
        if (!Object.prototype.hasOwnProperty.call(node, key))
            return { found: false, node: undefined };
        node = node[key];
    }
    return { found: true, node };
}
function probe(r) {
    if (!r.found)
        return { kind: "absent" };
    const n = r.node;
    if (n !== null && typeof n === "object")
        return { kind: "container", array: Array.isArray(n) };
    return { kind: "leaf", value: n };
}
// Single host dispatcher per binding. Only ever returns plain data (copy:true) — never host
// object refs → no escape surface beyond the data itself.
function dispatch(root, op, path) {
    const r = resolvePath(root, path);
    switch (op) {
        case "probe": return probe(r);
        case "keys": return r.found && r.node && typeof r.node === "object" ? Object.keys(r.node) : [];
        case "materialize": return r.found ? r.node : undefined;
        default: return { kind: "absent" };
    }
}
// Runs once per context. Defines __lazyMake(bridge, path, meta) -> proxy. The bridge is a
// param (not closed over) so multiple lazy globals can coexist, each with its own root.
const BOOTSTRAP = `
(() => {
  const isIndex = (k) => typeof k === "string" && /^\\d+$/.test(k);

  globalThis.__lazyMake = function (B, path, meta) {
    const call = (op, p) =>
      B.applySync(undefined, [op, p], { arguments: { copy: true }, result: { copy: true } });

    const isArray = !!(meta && meta.array);
    let mat = null; // array materialized once on first index/iterator access
    const ensureMat = () => (mat === null ? (mat = call("materialize", path) || []) : mat);
    const cache = new Map();

    return new Proxy(Object.create(null), {
      get(_, key) {
        if (typeof key === "symbol") {
          if (key === Symbol.iterator) {
            const arr = isArray ? ensureMat() : (Array.isArray(call("materialize", path)) ? call("materialize", path) : []);
            return arr[Symbol.iterator].bind(arr);
          }
          if (key === Symbol.toPrimitive) {
            return (hint) => {
              const p = call("probe", path);
              if (p.kind === "leaf") return p.value;
              return hint === "string" ? "[object]" : NaN;
            };
          }
          return undefined;
        }
        if (key === "__proto__" || key === "constructor" || key === "prototype") return undefined;
        if (cache.has(key)) return cache.get(key);
        // Array index: serve from the materialized-once copy, uncached (mat lookup is O(1)).
        if (isArray && isIndex(key)) return ensureMat()[key];

        let out;
        if (isArray) {
          // 'length' probes cheap; methods (map/reduce/...) delegate to the materialized array.
          if (key === "length") {
            const lp = call("probe", path.concat(key));
            out = lp.kind === "leaf" ? lp.value : undefined;
          } else {
            const arr = ensureMat();
            const v = arr[key];
            out = typeof v === "function" ? v.bind(arr) : v;
          }
        } else {
          const p = call("probe", path.concat(key));
          if (p.kind === "leaf") out = p.value;
          else if (p.kind === "absent") out = undefined;
          else out = globalThis.__lazyMake(B, path.concat(key), { array: p.array });
        }
        cache.set(key, out);
        return out;
      },
      has(_, key) {
        return call("probe", path.concat(key)).kind !== "absent";
      },
      ownKeys() {
        return call("keys", path);
      },
      getOwnPropertyDescriptor(_, key) {
        const p = call("probe", path.concat(key));
        if (p.kind === "absent") return undefined;
        const value = p.kind === "leaf" ? p.value : globalThis.__lazyMake(B, path.concat(key), { array: p.array });
        return { enumerable: true, configurable: true, writable: false, value };
      },
    });
  };
})();
`;
// Run once per context (after createContextSync).
function installLazyBootstrap(context) {
    context.evalSync(BOOTSTRAP);
}
// Bind `root` as a lazy proxy under `globalName`. Caller must release() to drop the global
// and free the host Reference. Re-binding the same name (transient rebind) requires releasing
// the previous binding first.
function bindLazyGlobal(context, globalName, root) {
    const bridge = new isolated_vm_1.default.Reference((op, path) => dispatch(root, op, path));
    const bridgeGlobal = `__lazyBridge$${globalName}`;
    const g = context.global;
    g.setSync(bridgeGlobal, bridge);
    context.evalSync(`globalThis[${JSON.stringify(globalName)}] = __lazyMake(${bridgeGlobal}, [], null);`);
    let released = false;
    return {
        release() {
            if (released)
                return;
            released = true;
            try {
                g.deleteSync(globalName);
                g.deleteSync(bridgeGlobal);
            }
            catch { /* isolate disposed */ }
            try {
                bridge.release();
            }
            catch { /* already gone */ }
        },
    };
}
