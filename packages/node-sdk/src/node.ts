import { Chat, Execution, Expression, Realtime, Workflow } from "@pretzel-graph/shared/domain";
import { InferFields, InferInputs, InferOutputs } from "./types";
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

    protected isWaiting: boolean = false;




    constructor(
        public readonly workflowNode: Workflow.Node,
        protected readonly context: RuntimeNode.ExecutionContext
    ) {
        this.fields = mapFieldValues<T_Blueprint>(this.workflowNode.id, context.workflowData);
        this.emit = context.emit;
    }





    /**
     * Called by the engine. Wraps onRun with shared pre/post logic.
     */
    public async run(
        inputs: InferInputs<T_Blueprint>
    ): Promise<Partial<InferOutputs<T_Blueprint>>> {
        this.isWaiting = false;
        this.fields = this.evaluateFields(inputs);

        return this.onRun(inputs);
    }




    protected abstract onRun(
        inputs: InferInputs<T_Blueprint>
    ): Promise<Partial<InferOutputs<T_Blueprint>>>;

    protected evaluateFields(
        incoming: Record<Port.Id, Projection> | Record<string, unknown>
    ): InferFields<T_Blueprint> {
        const fields = mapFieldValues<T_Blueprint>(this.workflowNode.id, this.context.workflowData);

        return Expression.evaluateNodeFields({
            node: this.workflowNode,
            fields,
            incoming: incoming as Record<Port.Id, Projection>,
            workflowConfig: Expression.resolveWorkflowConfig(this.context.workflowData.fields ?? {}),
        }) as InferFields<T_Blueprint>;
    }





    public async buildTool(
        inputs: InferInputs<T_ToolBlueprint>
    ): Promise<InferOutputs<T_ToolBlueprint>> {
        this.isWaiting = false;
        this.fields = this.evaluateFields(inputs);
        return this.onBuildTool(inputs);
    }




    protected onBuildTool(
        inputs: InferInputs<T_ToolBlueprint>
    ): Promise<InferOutputs<T_ToolBlueprint>> {
        throw new Error("This node cannot be converted to a tool");
    }





    public async wait(
        partialInputs: InferInputs<T_Blueprint>,
        dependencyResolutionMap: Record<Workflow.Node.Id, boolean>
    ): Promise<void> {
        this.isWaiting = true;
        this.fields = this.evaluateFields(partialInputs);
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





    public async triggerWebhook(
        webhookPaylod: Record<string, unknown>
    ): Promise<void> {
        return this.onWebhook(webhookPaylod);
    }



    protected async onWebhook(
        webhookPaylod: Record<string, unknown>
    ): Promise<void> { }





    protected AbortablePromise<T>(
        executor: (
            resolve: (value: T) => void,
            reject: (reason?: any) => void,
            signal: AbortSignal
        ) => void
    ): Promise<T> {
        const signal = this.context.abortSignal; 

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

export abstract class RuntimeRouterNode<T_Blueprint extends Blueprint> extends RuntimeNode<T_Blueprint> {

    public readonly isRouterNode: true = true;

    constructor(
        ...args: ConstructorParameters<typeof RuntimeNode>
    ) {
        super(...args)
    }

    public override async run(
        inputs: InferInputs<T_Blueprint>
    ): Promise<InferOutputs<T_Blueprint>> {
        this.isWaiting = false;
        this.fields = this.evaluateFields(inputs);
        return this.onRun(inputs) as Promise<InferOutputs<T_Blueprint>>;
    }

    protected abstract override onRun(
        inputs: InferInputs<T_Blueprint>
    ): Promise<Partial<InferOutputs<T_Blueprint>>>;
}


export namespace RuntimeNode {
    export type ConstructorProps = ConstructorParameters<typeof RuntimeNode>[0]
    export type CompileProps = Parameters<RuntimeNode<Blueprint>["compile"]>[0]
    
    export interface ExecutionContext {
        readonly executionId: Execution.Id,
        readonly chat_id: Chat.Id | undefined,
        readonly session: Execution.Session,
        readonly updateSession: (recipe: (draft: Execution.Session) => void) => void,
        readonly abortSignal: AbortSignal,
        readonly abortExecution: (reason?: any) => void,
        readonly emit: <T_Event extends Realtime.Event>(event: T_Event) => void,
        readonly workflowData: Workflow.Data,
        readonly workflowId: Workflow.Id,
        readonly workflowCache: Workflow.Cache,
    }
}
