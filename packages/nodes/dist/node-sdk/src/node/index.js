"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeNode = void 0;
const domain_1 = require("../../../shared/domain");
const mapFieldValues_1 = require("../utils/mapFieldValues");
const synthesizer_1 = require("../synthesizer");
class RuntimeNode {
    nodeId;
    context;
    fieldValues;
    credentials;
    /** Projected incoming-port bag from the last evaluateFieldValues pass — reused as `$in` when
     *  evaluating item-scoped fields, so per-item eval sees the same inputs as node-level eval. */
    projectedIn = {};
    isWaiting = false;
    /** Read by the engine's error interception hook: if an incoming error envelope
     *  is found, a catching node materializes it to `onError` instead of re-propagating. */
    CATCHES_ERROR = false;
    /** Controls how the engine fans out signals after this node completes.
     *  - "router" — signal only dependents connected to ports present in the result (default)
     *  - "all"    — signal every downstream dependent, regardless of returned ports
     *  - "none"   — suppress automatic fan-out entirely (node handled propagation itself) */
    PROPAGATION_STRATEGY = "router";
    getPropagationStrategy() {
        return this.PROPAGATION_STRATEGY;
    }
    /** Build every outbound HTTP client from here, NOT from `context.httpAPI` — this binds the
     *  node's attached proxy credential, so a client made any other way egresses directly.
     *  Arrow body, so the agent is resolved lazily on create() rather than at construction. */
    httpClientFactory = {
        create: (config) => this.context.httpAPI.create({
            proxy: this.context.proxyAPI.getAgentForNode(this.nodeId),
            ...config,
        }),
    };
    constructor(nodeId, context) {
        this.nodeId = nodeId;
        this.context = context;
        const fields = this.context.workflowQueryAPI.getFields(this.nodeId);
        const staticValues = this.context.workflowQueryAPI.getStaticValues(this.nodeId);
        this.fieldValues = (0, mapFieldValues_1.mapFieldValues)(fields, staticValues);
        this.credentials = this.mapCredentials();
    }
    mapCredentials() {
        const nodeCredIds = Object.entries(this.context.workflowData.credentialInstanceIds[this.nodeId] ?? {});
        const result = {};
        for (const [templateId, instanceId] of nodeCredIds) {
            const instance = this.context.credentialsAPI.getInstance(instanceId);
            if (instance)
                result[templateId] = instance;
        }
        return result;
    }
    /**
     * Called by the engine. Wraps onRun with shared pre/post logic.
     * fields must be pre-evaluated by the engine via evaluateFieldValues().
     */
    async run(incoming, fields) {
        this.isWaiting = false;
        this.fieldValues = fields;
        return this.onRun(incoming);
    }
    evaluateFieldValues(incoming) {
        const inputs = this.context.workflowQueryAPI.getInputs(this.nodeId);
        const fields = this.context.workflowQueryAPI.getFields(this.nodeId);
        const staticValues = this.context.workflowQueryAPI.getStaticValues(this.nodeId);
        const expressionOverrides = this.context.workflowQueryAPI.getExpressionTaggedFieldIds(this.nodeId);
        const fieldValues = (0, mapFieldValues_1.mapFieldValues)(fields, staticValues);
        const evaluated = { ...fieldValues };
        // Project each port value to its plain-object form before injecting as @in —
        // raw LC instances (BaseChatModel, BaseRetriever, etc.) contain functions that
        // can't be structured-cloned into the isolate.
        const projectedIncoming = {};
        for (const input of inputs) {
            const value = incoming[input.id];
            projectedIncoming[input.id] = synthesizer_1.Synthesizer.project(value, input.variant);
        }
        this.projectedIn = projectedIncoming;
        this.context.airlockAPI.executeSync({
            [domain_1.Airlock.Globals.IN]: projectedIncoming,
            [domain_1.Airlock.Globals.NODE_ID]: this.nodeId,
        }, (evaluate) => {
            for (const field of fields) {
                // Item-scoped fields are resolved per-element via evalItemField, not here —
                // `$item` isn't bound during this node-level pass.
                if (field.itemScoped === true)
                    continue;
                if (field.variant === "CaseList") {
                    const raw = evaluated[field.id];
                    if (!Array.isArray(raw))
                        continue;
                    evaluated[field.id] = raw.map(entry => entry.isExpression && typeof entry.value === "string"
                        ? { ...entry, value: !!evaluate(domain_1.Airlock.Source.asExpression(entry.value)) }
                        : entry);
                    continue;
                }
                if (!domain_1.Foundations.Field.usesExpression(field, expressionOverrides[field.id]))
                    continue;
                const raw = evaluated[field.id];
                if (typeof raw !== "string")
                    continue;
                evaluated[field.id] = evaluate(domain_1.Airlock.Source.asExpression(raw), domain_1.Airlock.coerceTargetForVariant(field.variant));
            }
        });
        return evaluated;
    }
    /**
     * Iterates `items` once, binding `$item` to the current element (and `$in` to this node's
     * projected inputs), and runs `fn` per element. The whole loop is a single atomic airlock
     * block: stable globals set once, only `$item` rebound per iteration.
     *
     * `fn` receives an `evalField` that resolves any item-scoped field (declared via
     * `FieldBuilder.itemScoped`) against the currently-bound element — so multiple item fields can
     * be evaluated in the same iteration without re-looping. Non-expression item fields return
     * their static value. Returns `fn`'s result per element, in order.
     */
    mapItems(items, fn, options) {
        const variant = options?.itemVariant ?? "Unresolved";
        const fields = this.context.workflowQueryAPI.getFields(this.nodeId);
        const staticValues = this.context.workflowQueryAPI.getStaticValues(this.nodeId);
        const expressionOverrides = this.context.workflowQueryAPI.getExpressionTaggedFieldIds(this.nodeId);
        // Resolve raw value + expression mode once per field, reused across every iteration.
        const rawValues = (0, mapFieldValues_1.mapFieldValues)(fields, staticValues);
        const meta = new Map();
        // Indexed dynamically by field id: InferFieldValues is a union once a blueprint has
        // derivatives, and only the resolved arm has any given key.
        const rawByFieldId = rawValues;
        for (const field of fields)
            meta.set(field.id, {
                raw: rawByFieldId[field.id],
                isExpression: domain_1.Foundations.Field.usesExpression(field, expressionOverrides[field.id])
            });
        return this.context.airlockAPI.executeSync({
            [domain_1.Airlock.Globals.IN]: this.projectedIn,
            [domain_1.Airlock.Globals.NODE_ID]: this.nodeId,
        }, (evaluate, setTransient) => {
            const evalField = ((fieldId, coerceTo) => {
                const m = meta.get(fieldId);
                // Static field → its resolved value as-is; expression → evaluated against $item.
                if (!m || !m.isExpression || typeof m.raw !== "string")
                    return m?.raw;
                const expression = domain_1.Airlock.Source.asExpression(m.raw);
                return evaluate(expression, coerceTo);
            });
            return items.map((item, index) => {
                setTransient({
                    [domain_1.Airlock.Globals.ITEM]: synthesizer_1.Synthesizer.project(item, variant),
                    [domain_1.Airlock.Globals.ITEM_INDEX]: index,
                });
                return fn({ item, index, evalField });
            });
        });
    }
    /**
     * Retypes `incoming` against narrowed field values so a derivative's branch-only ports are
     * readable. `satisfies` can't do this — it checks an expression without rebinding its type,
     * and TypeScript won't correlate two independent parameters.
     *
     *     if (fields.shape === "text") {
     *         const input = this.incomingFor(fields, incoming);
     *         input.suffix   // declared by the shape==text branch
     *     }
     *
     * Sound by construction: derive() only wires a branch's ports when its condition matched,
     * which is the same condition the narrowed `fields` type encodes.
     */
    incomingFor(_fields, incoming) {
        return incoming;
    }
    /**
     * Convenience over `mapItems` for the single-field case: evaluates one item-scoped field per
     * element. For multiple item fields per element, use `mapItems` directly to share one loop.
     */
    evalItemField(fieldId, items, options) {
        return this.mapItems(items, ({ evalField }) => evalField(fieldId, options?.coerceTo), { itemVariant: options?.itemVariant });
    }
    async buildTool(incoming, fields) {
        this.isWaiting = false;
        this.fieldValues = fields;
        return this.onBuildTool(incoming);
    }
    /**
     * Tool-mode entry point for nodes carrying a separate ToolBlueprint.
     *
     * A node using `defineTool` doesn't need one. That branch is terminal and total-replacing, so
     * tool mode is a disjoint arm of InferFieldValues rather than an orthogonal flag — `onRun`
     * narrows on the discriminant and returns whatever the resolved blueprint declares. Those
     * nodes leave this alone and fall through.
     */
    onBuildTool(incoming) {
        return this.onRun(incoming);
    }
    async wait(partialInputs, dependencyResolutionMap, fields) {
        this.isWaiting = true;
        this.fieldValues = fields;
        return this.onWait(partialInputs);
    }
    onWait(incoming) { }
    async compile(compilationContext) {
        return this.onCompile(compilationContext);
    }
    onCompile(compilationContext) { }
    async handleIgniter(igniter) {
        return this.onIgniter(igniter);
    }
    onIgniter(igniter) { }
    async triggerWebhook(webhookPaylod) {
        return this.onWebhook(webhookPaylod);
    }
    async onWebhook(webhookPaylod) { }
    onRecordMetrics(args) {
        return undefined;
    }
    recordMetrics(args) {
        try {
            return this.onRecordMetrics(args);
        }
        catch (err) {
            console.warn(`[RuntimeNode.recordMetrics] node=${this.nodeId} threw:`, err);
            return undefined;
        }
    }
    AbortablePromise(executor) {
        const signal = this.context.abortAPI.signal;
        if (signal.aborted)
            return Promise.reject(signal.reason);
        return new Promise((resolve, reject) => {
            const onAbort = () => reject(signal.reason);
            signal.addEventListener("abort", onAbort, { once: true });
            executor((value) => { signal.removeEventListener("abort", onAbort); resolve(value); }, (reason) => { signal.removeEventListener("abort", onAbort); reject(reason); }, signal);
        });
    }
}
exports.RuntimeNode = RuntimeNode;
(function (RuntimeNode) {
    let PropagationStrategy;
    (function (PropagationStrategy) {
        PropagationStrategy.ALL = "all";
        PropagationStrategy.ROUTER = "router";
        PropagationStrategy.NONE = "none";
    })(PropagationStrategy = RuntimeNode.PropagationStrategy || (RuntimeNode.PropagationStrategy = {}));
})(RuntimeNode || (exports.RuntimeNode = RuntimeNode = {}));
