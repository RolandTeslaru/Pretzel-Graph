import { ExecutionSession, Foundations, Orchestrator, Realtime, Workflow } from "@vx-agent-editor/shared/domain";
import { InferFields, InferFieldsWithInitial, InferInputs, InferOutputs } from "src/types";
import { Emitter } from "./event/emitter"
import type { CompilationContext } from "./compiler"
import { readonly } from "zod";

export abstract class RuntimeNode<

    T_Blueprint extends Foundations.Blueprint, 
    T_ToolBlueprint extends Foundations.Blueprint = any

> {

    public readonly emit: RuntimeNode.ExecutionContext["emit"];
    public fields: InferFields<T_Blueprint>

    protected isWaiting: boolean = false;

    constructor(
        public readonly workflowNode: Workflow.Node,
        protected readonly context: RuntimeNode.ExecutionContext
    ) {
        this.fields = RuntimeNode.resolveFields<T_Blueprint>(this.workflowNode.id, context.workflowData)
        this.emit = context.emit;
    }


    /**
     * Called by the engine. Wraps onRun with shared pre/post logic.
     */
    public async run(
        inputs: InferInputs<T_Blueprint>
    ): Promise<Partial<InferOutputs<T_Blueprint>>> {
        this.isWaiting = false;

        return this.onRun(inputs);
    }

    protected abstract onRun(
        inputs: InferInputs<T_Blueprint>
    ): Promise<Partial<InferOutputs<T_Blueprint>>>;





    public async buildTool(
        inputs: InferInputs<T_ToolBlueprint>
    ): Promise<InferOutputs<T_ToolBlueprint>> {
        this.isWaiting = false;
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





    public async webhook(

    ): Promise<void> {
        return this.onWebhook();
    }

    protected onWebhook(

    ): Promise<void> | void { }


    public static resolveInitialFieldValues<T_Blueprint extends Foundations.Blueprint>(
        blueprint: T_Blueprint,
        fields: Record<Foundations.Field.Id, Foundations.Field.Value>
    ): InferFieldsWithInitial<T_Blueprint> {

        const resolved: Record<Foundations.Field.Id, Foundations.Field.Value> = {}

        for (const field of blueprint.fields) {
            resolved[field.id] = field.initialValue as Foundations.Field.Value;
        }

        for (const [fieldId, fieldValue] of Object.entries(fields)) {
            resolved[fieldId as Foundations.Field.Id] = fieldValue;
        }

        return resolved as InferFieldsWithInitial<T_Blueprint>
    }

    // Checks if a field has static values
    // And if not, it uses the initialValue
    private static resolveFields<T_Blueprint extends Foundations.Blueprint>(
        nodeId: Workflow.Node.Id,
        workflowData: Workflow.Data
    ): InferFields<T_Blueprint> {
        const node = workflowData.nodes[nodeId];
        const staticValues = workflowData.staticValues[nodeId] ?? {};

        const resolved: Record<Foundations.Field.Id, Foundations.Field.Value> = {};

        for (const field of node.fields) {
            const fieldId = field.id as Foundations.Field.Id;

            if (fieldId in staticValues)
                resolved[fieldId] = staticValues[fieldId] as Foundations.Field.Value;
            else
                resolved[fieldId] = field.initialValue as Foundations.Field.Value;
        }

        return resolved as InferFields<T_Blueprint>
    }


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
}

export abstract class RuntimeRouterNode<T_Blueprint extends Foundations.Blueprint> extends RuntimeNode<T_Blueprint> {

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
        return this.onRun(inputs) as Promise<InferOutputs<T_Blueprint>>;
    }

    protected abstract override onRun(
        inputs: InferInputs<T_Blueprint>
    ): Promise<Partial<InferOutputs<T_Blueprint>>>;
}


export namespace RuntimeNode {
    export type ConstructorProps = ConstructorParameters<typeof RuntimeNode>[0]
    export type CompileProps = Parameters<RuntimeNode<Foundations.Blueprint>["compile"]>[0]
    
    export interface ExecutionContext {
        readonly session: ExecutionSession,
        readonly updateSession: (recipe: (draft: ExecutionSession) => void) => void,
        readonly abortSignal: AbortSignal,
        readonly abortWorkflow: (reason?: any) => void,
        readonly emit: <T_Event extends Realtime.Event>(event: T_Event) => void,
        readonly workflowData: Workflow.Data,
        readonly workflowId: Workflow.Id,
        readonly workflowCache: Workflow.Cache,
        readonly jobId: Orchestrator.Job.Id,
    }
}

