import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import { InferFields, InferFieldsWithInitial, InferInputs, InferOutputs } from "src/types";
import { RuntimeState } from "./state";

export abstract class RuntimeNode<T_Blueprint extends Foundations.Blueprint> {

    public workflowNode: Workflow.Node;

    constructor(props: {
        state: RuntimeState;
        workflowNode: Workflow.Node;
        workflow: Workflow;
        workflowCache: Workflow.Cache;
    }) {
        this.workflowNode = props.workflowNode;

        this.fields = RuntimeNode.resolveFields<T_Blueprint>(this.workflowNode.id, props.workflow)
    }

    public fields: InferFields<T_Blueprint>


    /**
     * Execute this node.
     * 
     * @param globalState - The full LangGraph runtime state
     * @param config - Static configuration values (NodeConfig fields like temperature, model, etc.)
     * @param inputs - Port inputs resolved from upstream edges or fallback values
     */
    public abstract run(
        globalState: RuntimeState,
        inputs: InferInputs<T_Blueprint>
    ): Promise<InferOutputs<T_Blueprint>>;

    protected async onConversion(
        currentBlueprint: T_Blueprint
    ): Promise<T_Blueprint> {
        return currentBlueprint
    }

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
}