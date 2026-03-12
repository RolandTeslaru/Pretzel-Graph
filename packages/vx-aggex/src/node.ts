import { Foundations, Workflow, Orchestrator } from "@vx-agent-editor/shared/domain";
import { InferFields, InferFieldsWithInitial, InferInputs, InferOutputs } from "src/types";
import { ExecutionContext } from "./context";
import { Emitter } from "./event/emitter"

export abstract class RuntimeNode<T_Blueprint extends Foundations.Blueprint> {

    public readonly emit: Emitter;
    public fields: InferFields<T_Blueprint>

    private isWaiting: boolean = false;

    constructor(
        public readonly workflowNode: Workflow.Node,
        protected readonly context: ExecutionContext
    ) {
        this.fields = RuntimeNode.resolveFields<T_Blueprint>(this.workflowNode.id, context.workflow)
        this.emit = context.emit;
    }


    /**
     * Called by the engine. Wraps onRun with shared pre/post logic.
     */
    public async run(
        inputs: InferInputs<T_Blueprint>
    ): Promise<InferOutputs<T_Blueprint>> {
        this.isWaiting = false;
        return this.onRun(this.context, inputs);
    }

    public async wait(
        partialInputs: InferInputs<T_Blueprint>,
        dependencyResolutionMap: Record<Workflow.Node.Id, boolean>
    ): Promise<void> {
        this.isWaiting = true;

        this.emit({
            type: "node:waiting",
            jobId: this.context.jobId,
            nodeId: this.workflowNode.id,
            topic: Orchestrator.Event.getTopic(this.context.jobId),
            workflowId: this.context.workflow.id,
            dependencyResolutionMap,
        } satisfies Orchestrator.Event.Job.Node.Waiting)

        return this.onWait(this.context, partialInputs);
    }

    /**
     * Implement this in each node. Called by run().
     */
    protected abstract onRun(
        context: ExecutionContext,
        inputs: InferInputs<T_Blueprint>
    ): Promise<InferOutputs<T_Blueprint>>;

    protected onWait(
        context: ExecutionContext,
        inputs: InferInputs<T_Blueprint>
    ): Promise<void> | void {}

    public init(
        context: ExecutionContext
    ): Promise<void> | void {}

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
        workflow: Workflow
    ): InferFields<T_Blueprint> {
        const node = workflow.data.nodes[nodeId];
        const staticValues = workflow.data.staticValues[nodeId] ?? {};

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
}

export namespace RuntimeNode {
    export type ConstructorProps = ConstructorParameters<typeof RuntimeNode>[0]
    export type InitProps = Parameters<RuntimeNode<Foundations.Blueprint>["init"]>[0]
}
