import { Airlock, Chat, Execution, Foundations, Realtime, Vault, Workflow } from "@pretzel-graph/shared/domain";
import { InferCredentials, InferCredentialValues, InferFields, InferInputs, InferItemFields, InferOutputs } from "./types";
import type { CompilationContext } from "./compiler-context";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import { Projection } from "@pretzel-graph/shared/domain/Foundations/Projection";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import { mapFieldValues } from "./utils/mapFieldValues";
import { Synthesizer } from "./synthesizer";

export abstract class RuntimeNode<

    T_Blueprint extends Blueprint,
    T_ToolBlueprint extends Blueprint = any

> {

    public readonly emit: RuntimeNode.ExecutionContext["realtimeAPI"]["emit"];
    public fields: InferFields<T_Blueprint>
    public readonly credentials: InferCredentials<T_Blueprint>

    /** Projected incoming-port bag from the last evaluateFields pass — reused as `$in` when
     *  evaluating item-scoped fields, so per-item eval sees the same inputs as node-level eval. */
    private projectedIn: Record<Port.Input.Id, Projection> = {};

    protected isWaiting: boolean = false;

    /** Exclude this node from the automatic __START__ wiring — it will only
     *  fire when explicitly triggered by another node via schedulerAPI or propagationAPI. */
    public readonly IS_PASSIVE: boolean = false

    /** Controls how the engine fans out signals after this node completes.
     *  - "all"    — signal every downstream dependent (default)
     *  - "router" — signal only dependents connected to ports present in the result
     *  - "none"   — suppress automatic fan-out entirely (node handled propagation itself) */
    protected PROPAGATION_STRATEGY: RuntimeNode.PropagationStrategy = "all"

    public getPropagationStrategy(): RuntimeNode.PropagationStrategy {
        return this.PROPAGATION_STRATEGY
    }




    constructor(
        public readonly workflowNode: Workflow.Node,
        protected readonly context: RuntimeNode.ExecutionContext
    ) {
        this.fields = mapFieldValues<T_Blueprint>(this.workflowNode.id, context.workflowData);
        this.credentials = this.mapCredentials();
        this.emit = context.realtimeAPI.emit;
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
        inputs: InferInputs<T_Blueprint>,
        fields: InferFields<T_Blueprint>,
    ): Promise<Partial<InferOutputs<T_Blueprint>>> {
        this.isWaiting = false;
        this.fields = fields;

        return this.onRun(inputs);
    }




    protected abstract onRun(
        inputs: InferInputs<T_Blueprint>
    ): Promise<Partial<InferOutputs<T_Blueprint>>>;




    public evaluateFields(
        incoming: Record<Port.Id, Projection>
    ): InferFields<T_Blueprint> {
        const fields = mapFieldValues<T_Blueprint>(this.workflowNode.id, this.context.workflowData);
        const evaluated: Record<Foundations.Field.Id, unknown> = { ...fields };

        // Project each port value to its plain-object form before injecting as @in —
        // raw LC instances (BaseChatModel, BaseRetriever, etc.) contain functions that
        // can't be structured-cloned into the isolate.
        const projectedIncoming: Record<Port.Input.Id, Projection> = {};
        for (const input of this.workflowNode.inputs) {
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
                for (const field of this.workflowNode.fields) {
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

        return evaluated as InferFields<T_Blueprint>;
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
        const rawValues = mapFieldValues<T_Blueprint>(this.workflowNode.id, this.context.workflowData)
        const meta      = new Map<Foundations.Field.Id, { raw: unknown, isExpression: boolean }>();
        
        for (const field of this.workflowNode.fields) 
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
        inputs: InferInputs<T_ToolBlueprint>,
        fields: InferFields<T_Blueprint>,
    ): Promise<InferOutputs<T_ToolBlueprint>> {
        this.isWaiting = false;
        this.fields = fields;
        return this.onBuildTool(inputs);
    }




    protected onBuildTool(
        inputs: InferInputs<T_ToolBlueprint>
    ): Promise<InferOutputs<T_ToolBlueprint>> {
        throw new Error("This node cannot be converted to a tool");
    }





    public async wait(
        partialInputs: InferInputs<T_Blueprint>,
        dependencyResolutionMap: Record<Workflow.Node.Id, boolean>,
        fields: InferFields<T_Blueprint>,
    ): Promise<void> {
        this.isWaiting = true;
        this.fields = fields;
        return this.onWait(partialInputs);
    }
    


    
    protected onWait(
        inputs: InferInputs<T_Blueprint>
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
        inputs:   InferInputs<T_Blueprint>,
        outputs:  Partial<InferOutputs<T_Blueprint>>,
        unitId:   Execution.Recording.UnitOfWork.Id,
        status:   Execution.Recording.UnitOfWork["status"],
        duration: number,
    }): Record<string, Execution.Recording.Metric> | undefined {
        return undefined;
    }

    public recordMetrics(args: {
        inputs:   InferInputs<T_Blueprint>,
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

    export type ConstructorProps = ConstructorParameters<typeof RuntimeNode>[0]
    export type CompileProps = Parameters<RuntimeNode<Blueprint>["compile"]>[0]

    export type LoaderResult = {
        options: Foundations.Field.ResourceLoader.OptionItem[];
        nextPaginationCursor?: string;
    };

    export type LoaderContext<T_Blueprint extends Blueprint = Blueprint> = {
        fieldValues: InferFields<T_Blueprint>;
        credentials: InferCredentials<T_Blueprint>;
        credentialsAPI: {
            getInstance(instanceId: Vault.Credential.Instance.Id): Vault.Credential.Instance | undefined;
            getDecryptedValue<T = unknown>(blob: Vault.Credential.Instance.EncryptedBlob<T>): InferCredentialValues<T>;
        };
        searchQuery?: string;
        paginationCursor?: string;
    };

    export type LoaderFn<T_Blueprint extends Blueprint = Blueprint> =
        (context: LoaderContext<T_Blueprint>) => Promise<LoaderResult>;

    export interface ExecutionContext {
        readonly executionId: Execution.Id,
        readonly chat_id: Chat.Id | null | undefined,
        readonly session: Execution.Session,
        readonly updateSession: (recipe: (draft: Execution.Session) => void) => void,
        readonly realtimeAPI: {
            emit: <T_Event extends Realtime.Event>(event: T_Event) => void,
            awaitSignal: <S>(
                channel: Realtime.Channel,
                schema:  { parse: (data: unknown) => S },
                timeout: number,
            ) => Promise<S>,
            emitAndAwaitSignal: <E extends Realtime.Event, S>(
                event:         E,
                signalChannel: Realtime.Channel,
                signalSchema:  { parse: (data: unknown) => S },
                timeout:       number,
            ) => Promise<S>,
        },
        readonly workflowData: Workflow.Data,
        readonly workflowId: Workflow.Id,
        readonly workflowCache: Workflow.Cache,

        // APIS
        readonly airlockAPI: Airlock.API,
        readonly credentialsAPI: {
            getInstance(instanceId: Vault.Credential.Instance.Id): Vault.Credential.Instance | undefined
            getDecryptedValue<T = unknown>(blob: Vault.Credential.Instance.EncryptedBlob<T>): InferCredentialValues<T>
        },
        readonly abortAPI: {
            signal: AbortSignal,
            abort:  (reason?: any) => void,
        },
        readonly portAPI: {
            write: (
                nodeId: Workflow.Node.Id,
                outputId: Port.Output.Id,
                value: unknown,
            ) => void,
        },
        readonly propagationAPI: {
            emitPort: (
                nodeId: Workflow.Node.Id,
                outputId: Port.Output.Id,
            ) => void,
            emitNode: (
                nodeId: Workflow.Node.Id,
            ) => void,
        },
        readonly instanceRegistryAPI: {
            get:    (nodeId: Workflow.Node.Id) => RuntimeNode<Blueprint> | undefined,
            getAll: () => RuntimeNode<Blueprint>[],
        },
        readonly workflowQueryAPI: {
            getNodesByBlueprint: <T_Blueprint extends Blueprint>(blueprintId: Foundations.Blueprint.Id) => Array<{
                node: Workflow.Node,
                fields: InferFields<T_Blueprint>,
            }>,
            getNodeOutput: (nodeId: Workflow.Node.Id, portId: Port.Output.Id) => unknown,
        },
        readonly schedulerAPI: {
            fireNode: (nodeId: Workflow.Node.Id, signals?: Set<Workflow.Node.Id>) => void,
            signalNode: (nodeId: Workflow.Node.Id, fromNodeId: Workflow.Node.Id) => void,
            removeSignal: (nodeId: Workflow.Node.Id, fromNodeId: Workflow.Node.Id) => void,
            clearSignals: (nodeId: Workflow.Node.Id) => void,
            scheduleCheck: (nodeId: Workflow.Node.Id) => void,
        },
        readonly enclosingNodeAPI?: {
            writePort: (
                outputId: Port.Output.Id,
                value: unknown,
            ) => void,
            emitPort: (
                outputId: Port.Output.Id,
            ) => void,
        },
        readonly subWorkflowAPI: {
            createEnv: () => {
                compile: (
                    workflowId: Workflow.Id,
                    workflowData: Workflow.Data,
                    execution: Execution,
                    compilationCtx: CompilationContext,
                    enclosingNodeAPI?: ExecutionContext["enclosingNodeAPI"],
                ) => Promise<unknown>,
                run: (ctx: unknown) => Promise<unknown>,
            }
        },
        readonly dependencyAPI: {
            getPublished: (workflowId: Workflow.Id) => Workflow.Dependency.Publication,
            getDraft:     (workflowId: Workflow.Id) => Workflow.Dependency.Draft,
        },
    }
}
