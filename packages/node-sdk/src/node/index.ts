import { Airlock, Execution, Foundations, Vault, Workflow } from "@pretzel-graph/shared/domain";
import { InferCredentials, InferFieldValues, InferIncoming, InferItemFields, InferOutputs } from "../types";
import type { CompilationContext } from "../compiler-context";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import { Projection } from "@pretzel-graph/shared/domain/Foundations/Projection";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import { mapFieldValues } from "../utils/mapFieldValues";
import { Synthesizer } from "../synthesizer";
import type { ExecutionContext as ExecutionContextType } from "./context";

export abstract class RuntimeNode<

    T_Blueprint extends Blueprint,
    T_ToolBlueprint extends Blueprint = any

> {

    public fieldValues: InferFieldValues<T_Blueprint>
    public readonly credentials: InferCredentials<T_Blueprint>

    /** Projected incoming-port bag from the last evaluateFields pass — reused as `$in` when
     *  evaluating item-scoped fields, so per-item eval sees the same inputs as node-level eval. */
    private projectedIn: Record<Port.Input.Id, Projection> = {};

    protected isWaiting: boolean = false;

    /** Exclude this node from the automatic __START__ wiring — it will only
     *  fire when explicitly triggered by another node via schedulerAPI or propagationAPI. */
    public readonly IS_PASSIVE: boolean = false

    /** Read by the engine's error interception hook: if an incoming error envelope
     *  is found, a catching node materializes it to `onError` instead of re-propagating. */
    public readonly CATCHES_ERROR: boolean = false

    /** Controls how the engine fans out signals after this node completes.
     *  - "all"    — signal every downstream dependent (default)
     *  - "router" — signal only dependents connected to ports present in the result
     *  - "none"   — suppress automatic fan-out entirely (node handled propagation itself) */
    protected readonly PROPAGATION_STRATEGY: RuntimeNode.PropagationStrategy = "all"

    public getPropagationStrategy(): RuntimeNode.PropagationStrategy {
        return this.PROPAGATION_STRATEGY
    }




    constructor(
        public readonly workflowNode: Workflow.Node,
        protected readonly context: RuntimeNode.ExecutionContext
    ) {
        this.fieldValues = mapFieldValues<T_Blueprint>(this.blueprint.fields, this.staticValues);
        this.credentials = this.mapCredentials();
    }

    /** Resolved (post-reconcile) blueprint for this node, stashed on the context by the compiler. */
    protected get blueprint(): T_Blueprint {
        return this.context.catalogueAPI.getBlueprint(this.workflowNode.id) as T_Blueprint;
    }

    protected get staticValues(): Record<Foundations.Field.Id, Foundations.Field.Value> {
        return this.context.workflowData.staticValues[this.workflowNode.id] ?? {};
    }

    private mapCredentials(): InferCredentials<T_Blueprint> {
        const nodeCredIds = this.context.workflowData.credentialInstanceIds[this.workflowNode.id] ?? {};
        const result: Record<string, Vault.Credential.Instance> = {};
        for (const [templateId, instanceId] of Object.entries(nodeCredIds) as [Vault.Credential.Template.Id, Vault.Credential.Instance.Id][]) {
            const instance = this.context.credentialsAPI.getInstance(instanceId);
            if (instance) result[templateId] = instance;
        }
        return result as InferCredentials<T_Blueprint>;
    }






    /**
     * Called by the engine. Wraps onRun with shared pre/post logic.
     * fields must be pre-evaluated by the engine via evaluateFields().
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




    public evaluateFields(
        incoming: Record<Port.Id, Projection>
    ): InferFieldValues<T_Blueprint> {
        const fields = mapFieldValues<T_Blueprint>(this.blueprint.fields, this.staticValues);
        const evaluated: Record<Foundations.Field.Id, unknown> = { ...fields };

        // Project each port value to its plain-object form before injecting as @in —
        // raw LC instances (BaseChatModel, BaseRetriever, etc.) contain functions that
        // can't be structured-cloned into the isolate.
        const projectedIncoming: Record<Port.Input.Id, Projection> = {};
        for (const input of this.blueprint.inputs) {
            const value = incoming[input.id];
            projectedIncoming[input.id] = Synthesizer.project(value, input.variant);
        }
        this.projectedIn = projectedIncoming;

        this.context.airlockAPI.executeSync(
            {
                [Airlock.GLOBALS.in]: projectedIncoming,
                [Airlock.GLOBALS.nodeId]: this.workflowNode.id,
            },
            (evaluate) => {
                for (const field of this.blueprint.fields) {
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

                    if (!Foundations.Field.isExpression(field)) continue;
                    const raw = evaluated[field.id];
                    if (typeof raw !== "string") continue;

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

        // Resolve raw value + isExpression once per field, reused across every iteration.
        const rawValues = mapFieldValues<T_Blueprint>(this.blueprint.fields, this.staticValues)
        const meta      = new Map<Foundations.Field.Id, { raw: unknown, isExpression: boolean }>();

        for (const field of this.blueprint.fields)
            meta.set(field.id, {
                raw: rawValues[field.id],
                isExpression: Foundations.Field.isExpression(field)
            });

        return this.context.airlockAPI.executeSync(
            {
                [Airlock.GLOBALS.in]:     this.projectedIn,
                [Airlock.GLOBALS.nodeId]: this.workflowNode.id,
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

                    return evaluate(Airlock.Source.asExpression(m.raw), coerceTo) as InferItemFields<T_Blueprint>[K];
                });

                return items.map((item, index) => {
                    setTransient({
                        [Airlock.GLOBALS.item]:      Synthesizer.project(item, variant),
                        [Airlock.GLOBALS.itemIndex]: index,
                    });
                    return fn({ item, index, evalField });
                });
            },
        );
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




    protected onBuildTool(
        incoming: InferIncoming<T_ToolBlueprint>
    ): Promise<InferOutputs<T_ToolBlueprint>> {
        throw new Error("This node cannot be converted to a tool");
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
            console.warn(`[RuntimeNode.recordMetrics] node=${this.workflowNode.id} threw:`, err);
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
}
