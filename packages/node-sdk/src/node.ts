import { Chat, Execution, Expression, Foundations, Realtime, Vault, Workflow } from "@pretzel-graph/shared/domain";
import { InferCredentials, InferCredentialValues, InferFields, InferInputs, InferOutputs } from "./types";
import type { CompilationContext } from "./compiler-context";
import { REDIS_HOST, REDIS_PORT } from "@pretzel-graph/shared/constants";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import { Projection } from "@pretzel-graph/shared/domain/Foundations/Projection";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import Redis from "ioredis";
import { mapFieldValues } from "./utils/mapFieldValues";
 
export abstract class RuntimeNode<

    T_Blueprint extends Blueprint,
    T_ToolBlueprint extends Blueprint = any

> {

    public readonly emit: RuntimeNode.ExecutionContext["emit"];
    public fields: InferFields<T_Blueprint>
    public readonly credentials: InferCredentials<T_Blueprint>

    protected isWaiting: boolean = false;

    /** Exclude this node from the automatic __START__ wiring — it will only
     *  fire when explicitly triggered by another node via schedulerAPI or propagationAPI. */
    public readonly IS_PASSIVE: boolean = false

    /** Controls how the engine fans out signals after this node completes.
     *  - "all"    — signal every downstream dependent (default)
     *  - "router" — signal only dependents connected to ports present in the result
     *  - "none"   — suppress automatic fan-out entirely (node handled propagation itself) */
    public getPropagationStrategy(): RuntimeNode.PropagationStrategy {
        return "all"
    }




    constructor(
        public readonly workflowNode: Workflow.Node,
        protected readonly context: RuntimeNode.ExecutionContext
    ) {
        this.fields = mapFieldValues<T_Blueprint>(this.workflowNode.id, context.workflowData);
        this.credentials = this.mapCredentials();
        this.emit = context.emit;
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
        incoming: Record<Port.Id, Projection> | Record<string, unknown>
    ): InferFields<T_Blueprint> {
        const fields = mapFieldValues<T_Blueprint>(this.workflowNode.id, this.context.workflowData);

        return Expression.evaluateNodeFields({
            node: this.workflowNode,
            fields,
            incoming: incoming as Record<Port.Id, Projection>,
            workflowConfig: Expression.resolveWorkflowConfig(this.context.workflowData),
        }) as InferFields<T_Blueprint>;
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




    protected CreateSignalPromise<T>(
        signalChannel: Realtime.Channel,
        schema:        { parse: (data: unknown) => T },
        timeout:       number,
    ): Promise<T> {
        return this.AbortablePromise((_resolve, _reject, abortSignal) => {
            const redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

            const cleanup = () => {
                clearTimeout(timer);
                redis.unsubscribe(signalChannel).catch(() => {});
                redis.disconnect();
            };

            const resolve = (value: T)     => { cleanup(); _resolve(value); };
            const reject  = (reason?: any) => { cleanup(); _reject(reason); };

            const timer = setTimeout(() => reject(new Error('Signal timed out')), timeout);

            abortSignal.addEventListener('abort', cleanup, { once: true });

            redis.subscribe(signalChannel, (err) => {
                if (err) reject(err);
            });

            redis.on('message', (_channel, raw) => {
                try {
                    resolve(schema.parse(JSON.parse(raw)));
                } catch (e) {
                    reject(e);
                }
            });
        });
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
        /** Typed static field values, keyed by field literal id — same shape as `this.fields`. */
        fieldValues: InferFields<T_Blueprint>;
        /** Typed credential instances, keyed by template id — same shape as `this.credentials`. */
        credentials: InferCredentials<T_Blueprint>;
        /** Decryption capability — identical surface to ExecutionContext.credentialsAPI. */
        credentialsAPI: {
            getInstance(instanceId: Vault.Credential.Instance.Id): Vault.Credential.Instance | undefined;
            getDecryptedValue<T = unknown>(blob: Vault.Credential.Instance.EncryptedBlob<T>): InferCredentialValues<T>;
        };
        /** Search string typed by the user, if any */
        searchQuery?: string;
        /** Pagination cursor from a previous call */
        paginationCursor?: string;
    };

    export type LoaderFn<T_Blueprint extends Blueprint = Blueprint> =
        (context: LoaderContext<T_Blueprint>) => Promise<LoaderResult>;

    export interface ExecutionContext {
        readonly executionId: Execution.Id,
        readonly chat_id: Chat.Id | undefined,
        readonly session: Execution.Session,
        readonly updateSession: (recipe: (draft: Execution.Session) => void) => void,
        readonly emit: <T_Event extends Realtime.Event>(event: T_Event) => void,
        readonly workflowData: Workflow.Data,
        readonly workflowId: Workflow.Id,
        readonly workflowCache: Workflow.Cache,
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
                    emit: ExecutionContext["emit"],
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
