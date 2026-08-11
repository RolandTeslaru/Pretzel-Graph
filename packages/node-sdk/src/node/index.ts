import { Airlock, Execution, Foundations, Vault, Workflow } from "@pretzel-graph/shared/domain";
import { InferCredentials, InferFieldValues, InferIncoming, InferItemFields, InferOutputs } from "../types";
import type { CompilationContext } from "../compiler-context";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import { Projection } from "@pretzel-graph/shared/domain/Foundations/Projection";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import { mapFieldValues } from "../utils/mapFieldValues";
import { Synthesizer } from "../synthesizer";
import type { ExecutionContext as ExecutionContextType } from "./context";
import type {
    AgentToolBinding as AgentToolBindingType,
    RealtimeAPI      as RealtimeAPIType,
    RealtimeScope    as RealtimeScopeType,
} from "./apis";
import type { HTTP } from "../domain/http";

export abstract class RuntimeNode<

    T_Blueprint extends Blueprint,
    T_ToolBlueprint extends Blueprint = any

> {

    public fieldValues: InferFieldValues<T_Blueprint>
    public readonly credentials: InferCredentials<T_Blueprint>

    /** Projected incoming-port bag from the last evaluateFieldValues pass — reused as `$in` when
     *  evaluating item-scoped fields, so per-item eval sees the same inputs as node-level eval. */
    private projectedIn: Record<Port.Input.Id, Projection> = {};

    protected isWaiting: boolean = false;

    /** Read by the engine's error interception hook: if an incoming error envelope
     *  is found, a catching node materializes it to `onError` instead of re-propagating. */
    public readonly CATCHES_ERROR: boolean = false

    /** Controls how the engine fans out signals after this node completes.
     *  - "router" — signal only dependents connected to ports present in the result (default)
     *  - "all"    — signal every downstream dependent, regardless of returned ports
     *  - "none"   — suppress automatic fan-out entirely (node handled propagation itself) */
    protected readonly PROPAGATION_STRATEGY: RuntimeNode.PropagationStrategy = "router"

    public getPropagationStrategy(): RuntimeNode.PropagationStrategy {
        return this.PROPAGATION_STRATEGY
    }


    /** Build every outbound HTTP client from here, NOT from `context.httpAPI` — this binds the
     *  node's attached proxy credential, so a client made any other way egresses directly.
     *  Arrow body, so the agent is resolved lazily on create() rather than at construction. */
    protected readonly httpClientFactory: HTTP.ClientAPI = {
        create: (config) => this.context.httpAPI.create({
            proxy: this.context.proxyAPI.getAgentForNode(this.nodeId),
            ...config,
        }),
    }




    constructor(
        public readonly nodeId: Workflow.Node.Id,
        protected readonly context: RuntimeNode.ExecutionContext
    ) {
        const fields       = this.context.workflowQueryAPI.getFields(this.nodeId);
        const staticValues = this.context.workflowQueryAPI.getStaticValues(this.nodeId);

        this.fieldValues = mapFieldValues<T_Blueprint>(fields, staticValues);
        this.credentials = this.mapCredentials();
    }


    private mapCredentials(): InferCredentials<T_Blueprint> {
        const nodeCredIds = Object.entries(
                                this.context.workflowData.credentialInstanceIds[this.nodeId] ?? {}
                            )as [Vault.Credential.Template.Id, Vault.Credential.Instance.Id][]

        const result: Record<string, Vault.Credential.Instance> = {};

        for (const [templateId, instanceId] of nodeCredIds) {
            const instance = this.context.credentialsAPI.getInstance(instanceId);
            if (instance)
                result[templateId] = instance;
        }
        return result as InferCredentials<T_Blueprint>;
    }






    /**
     * Called by the engine. Wraps onRun with shared pre/post logic.
     * fields must be pre-evaluated by the engine via evaluateFieldValues().
     */
    public async run(
        incoming: InferIncoming<T_Blueprint>,
        fields: InferFieldValues<T_Blueprint>,
    ): Promise<Partial<InferOutputs<T_Blueprint>>> {
        this.isWaiting = false;
        this.fieldValues = fields;

        return this.onRun(incoming);
    }




    protected abstract onRun(
        incoming: InferIncoming<T_Blueprint>
    ): Promise<Partial<InferOutputs<T_Blueprint>>>;




    public evaluateFieldValues(
        incoming: Record<Port.Id, Projection>
    ): InferFieldValues<T_Blueprint> {

        const inputs       = this.context.workflowQueryAPI.getInputs(this.nodeId);
        const fields       = this.context.workflowQueryAPI.getFields(this.nodeId);
        const staticValues = this.context.workflowQueryAPI.getStaticValues(this.nodeId);
        const expressionOverrides = this.context.workflowQueryAPI.getExpressionTaggedFieldIds(this.nodeId);

        const fieldValues = mapFieldValues<T_Blueprint>(fields, staticValues);

        const evaluated: Record<Foundations.Field.Id, unknown> = { ...fieldValues };

        // Project each port value to its plain-object form before injecting as @in —
        // raw LC instances (BaseChatModel, BaseRetriever, etc.) contain functions that
        // can't be structured-cloned into the isolate.
        const projectedIncoming: Record<Port.Input.Id, Projection> = {};
        for (const input of inputs) {
            const value = incoming[input.id];
            projectedIncoming[input.id] = Synthesizer.project(value, input.variant);
        }
        this.projectedIn = projectedIncoming;


        this.context.airlockAPI.executeSync(
            {
                [Airlock.Globals.IN]:      projectedIncoming,
                [Airlock.Globals.NODE_ID]: this.nodeId,
            },
            (evaluate) => {
                for (const field of fields) {
                    // Item-scoped fields are resolved per-element via evalItemField, not here —
                    // `$item` isn't bound during this node-level pass.
                    if (field.itemScoped === true) continue;

                    if (field.variant === "CaseList") {
                        const raw = evaluated[field.id]
                        if (!Array.isArray(raw))
                            continue;

                        evaluated[field.id] = raw.map(entry => 
                            entry.isExpression && typeof entry.value === "string"
                                ? { ...entry, value: !!evaluate(Airlock.Source.asExpression(entry.value)) }
                                : entry
                        );
                        continue;
                    }

                    if (!Foundations.Field.usesExpression(field, expressionOverrides[field.id]))
                        continue;

                    const raw = evaluated[field.id];
                    if (typeof raw !== "string")
                        continue;

                    evaluated[field.id] = evaluate(
                        Airlock.Source.asExpression(raw),
                        Airlock.coerceTargetForVariant(field.variant),
                    );
                }
            },
        );

        return evaluated as InferFieldValues<T_Blueprint>;
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
    protected mapItems<R>(
        items: unknown[],
        fn: (ctx: {
            item: unknown,
            index: number,
            evalField: <K extends keyof InferItemFields<T_Blueprint> & string>(
                fieldId: K,
                coerceTo?: Airlock.CoerceTo,
            ) => InferItemFields<T_Blueprint>[K],
        }) => R,
        options?: {
            /** Port variant used to project eachand element before it crosses into the isolate. */
            itemVariant?: Port.Variant,
        },
    ): R[] {
        const variant = options?.itemVariant ?? "Unresolved";

        const fields       = this.context.workflowQueryAPI.getFields(this.nodeId);
        const staticValues = this.context.workflowQueryAPI.getStaticValues(this.nodeId);
        const expressionOverrides = this.context.workflowQueryAPI.getExpressionTaggedFieldIds(this.nodeId);

        // Resolve raw value + expression mode once per field, reused across every iteration.
        const rawValues = mapFieldValues<T_Blueprint>(fields, staticValues);
        const meta      = new Map<Foundations.Field.Id, { raw: unknown, isExpression: boolean }>();

        // Indexed dynamically by field id: InferFieldValues is a union once a blueprint has
        // derivatives, and only the resolved arm has any given key.
        const rawByFieldId = rawValues as Record<Foundations.Field.Id, unknown>;

        for (const field of fields)
            meta.set(field.id, {
                raw: rawByFieldId[field.id],
                isExpression: Foundations.Field.usesExpression(field, expressionOverrides[field.id])
            });

        return this.context.airlockAPI.executeSync(
            {
                [Airlock.Globals.IN]:     this.projectedIn,
                [Airlock.Globals.NODE_ID]: this.nodeId,
            },
            (evaluate, setTransient) => {
                const evalField = (<K extends keyof InferItemFields<T_Blueprint>>(
                    fieldId: K,
                    coerceTo?: Airlock.CoerceTo,
                ) => {
                    const m = meta.get(fieldId as Foundations.Field.Id);
                    // Static field → its resolved value as-is; expression → evaluated against $item.
                    if (!m || !m.isExpression || typeof m.raw !== "string")
                        return m?.raw as InferItemFields<T_Blueprint>[K];

                    const expression = Airlock.Source.asExpression(m.raw);

                    return evaluate(expression, coerceTo) as InferItemFields<T_Blueprint>[K];
                });

                return items.map((item, index) => {
                    setTransient({
                        [Airlock.Globals.ITEM]:       Synthesizer.project(item, variant),
                        [Airlock.Globals.ITEM_INDEX]: index,
                    });
                    return fn({ item, index, evalField });
                });
            },
        );
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
    protected incomingFor<T_Values>(
        _fields:  T_Values,
        incoming: InferIncoming<T_Blueprint>,
    ): InferIncoming<T_Blueprint, T_Values> {
        return incoming as InferIncoming<T_Blueprint, T_Values>;
    }

    /**
     * Convenience over `mapItems` for the single-field case: evaluates one item-scoped field per
     * element. For multiple item fields per element, use `mapItems` directly to share one loop.
     */
    protected evalItemField<K extends keyof InferItemFields<T_Blueprint> & string>(
        fieldId: K,
        items: unknown[],
        options?: {
            coerceTo?: Airlock.CoerceTo,
            itemVariant?: Port.Variant,
        },
    ): Array<InferItemFields<T_Blueprint>[K]> {
        return this.mapItems(
            items,
            ({ evalField }) => evalField(fieldId, options?.coerceTo),
            { itemVariant: options?.itemVariant },
        );
    }





    public async buildTool(
        incoming: InferIncoming<T_ToolBlueprint>,
        fields: InferFieldValues<T_Blueprint>,
    ): Promise<InferOutputs<T_ToolBlueprint>> {
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
    protected onBuildTool(
        incoming: InferIncoming<T_ToolBlueprint>
    ): Promise<InferOutputs<T_ToolBlueprint>> {
        return this.onRun(incoming as never) as never;
    }





    public async wait(
        partialInputs: InferIncoming<T_Blueprint>,
        dependencyResolutionMap: Record<Workflow.Node.Id, boolean>,
        fields: InferFieldValues<T_Blueprint>,
    ): Promise<void> {
        this.isWaiting = true;
        this.fieldValues = fields;
        return this.onWait(partialInputs);
    }




    protected onWait(
        incoming: InferIncoming<T_Blueprint>
    ): Promise<void> | void {}





    public async compile(
        compilationContext: CompilationContext
    ): Promise<void> {
        return this.onCompile(compilationContext);
    }



    protected onCompile(
        compilationContext: CompilationContext,
    ): Promise<void> | void { }





    public async handleIgniter(
        igniter: Execution.Igniter,
    ): Promise<void> {
        return this.onIgniter(igniter);
    }




    protected onIgniter(
        igniter: Execution.Igniter,
    ): Promise<void> | void { }




    public async triggerWebhook(
        webhookPaylod: Record<string, unknown>
    ): Promise<void> {
        return this.onWebhook(webhookPaylod);
    }



    protected async onWebhook(
        webhookPaylod: Record<string, unknown>
    ): Promise<void> { }



    protected onRecordMetrics(args: {
        inputs:   InferIncoming<T_Blueprint>,
        outputs:  Partial<InferOutputs<T_Blueprint>>,
        unitId:   Execution.Recording.UnitOfWork.Id,
        status:   Execution.Recording.UnitOfWork["status"],
        duration: number,
    }): Record<string, Execution.Recording.Metric> | undefined {
        return undefined;
    }

    public recordMetrics(args: {
        inputs:   InferIncoming<T_Blueprint>,
        outputs:  Partial<InferOutputs<T_Blueprint>>,
        unitId:   Execution.Recording.UnitOfWork.Id,
        status:   Execution.Recording.UnitOfWork["status"],
        duration: number,
    }): Record<string, Execution.Recording.Metric> | undefined {
        try {
            return this.onRecordMetrics(args);
        } catch (err) {
            console.warn(`[RuntimeNode.recordMetrics] node=${this.nodeId} threw:`, err);
            return undefined;
        }
    }





    protected AbortablePromise<T>(
        executor: (
            resolve: (value: T) => void,
            reject: (reason?: any) => void,
            signal: AbortSignal
        ) => void
    ): Promise<T> {
        const signal = this.context.abortAPI.signal;

        if (signal.aborted)
            return Promise.reject(signal.reason);

        return new Promise<T>((resolve, reject,) => {
            const onAbort = () => reject(signal.reason);

            signal.addEventListener("abort", onAbort, { once: true });

            executor(
                (value) => { signal.removeEventListener("abort", onAbort); resolve(value); },
                (reason) => { signal.removeEventListener("abort", onAbort); reject(reason); },
                signal
            );
        })
    }




}



export namespace RuntimeNode {
    export type PropagationStrategy = "all" | "router" | "none"
    export namespace PropagationStrategy {
        export const ALL:    PropagationStrategy = "all";
        export const ROUTER: PropagationStrategy = "router";
        export const NONE:   PropagationStrategy = "none";
    }

    export type ConstructorProps = ConstructorParameters<typeof RuntimeNode>[0]
    export type CompileProps = Parameters<RuntimeNode<Blueprint>["compile"]>[0]

    export type ExecutionContext = ExecutionContextType;
    export type AgentToolBinding = AgentToolBindingType;
    export type RealtimeAPI      = RealtimeAPIType;
    export type RealtimeScope    = RealtimeScopeType;
}
