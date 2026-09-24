import type { Dependency, Foundations, Vault, Workflow } from "@pretzel-graph/shared/domain";
import type { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import type { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import type { InferFieldValues } from "../types";



// Finds other nodes in the workflow by blueprint id, and reads a node's already-produced output.
export interface WorkflowQueryAPI {
    /** The blueprint a node resolved to. Not the same as getFields, which folds in node-level ports. */
    getBlueprint:  (nodeId: Workflow.Node.Id) => Foundations.Blueprint,
    getNodesByBlueprint: <T_Blueprint extends Blueprint>(blueprintId: Foundations.Blueprint.Id) => Array<{
        node: Workflow.Node.Raw,
        fields: InferFieldValues<T_Blueprint>,
    }>,
    getNode:       (nodeId: Workflow.Node.Id) => Workflow.Node.Raw | undefined,
    getNodeOutput: (nodeId: Workflow.Node.Id, portId: Port.Output.Id) => unknown,
    getInputs:     (nodeId: Workflow.Node.Id) => Port.Input[],
    getOutputs:    (nodeId: Workflow.Node.Id) => Port.Output[],
    getFields:     (nodeId: Workflow.Node.Id) => readonly Foundations.Field[],
    getNodeDependency: (nodeId: Workflow.Node.Id) => Dependency.ValueFor<Dependency.Ref.Workflow> | null,
    getOutputPort: (nodeId: Workflow.Node.Id, portId: Port.Output.Id) => Port.Output | undefined,
    getInputPort:  (nodeId: Workflow.Node.Id, portId: Port.Input.Id) => Port.Input | undefined,
    hasOutputEdge: (nodeId: Workflow.Node.Id, portId: Port.Output.Id) => boolean,
    getStaticValues: (nodeId: Workflow.Node.Id) => Record<Foundations.Field.Id, Foundations.Field.Value>,
    /** Which credential instance is bound to each of the node's credential slots. */
    getCredentialIds: (nodeId: Workflow.Node.Id) => Record<Vault.Credential.Template.Id, Vault.Credential.Instance.Id>,
    /** Per-node static/expression overrides. Absent key = no user choice; see Field.usesExpression. */
    getExpressionTaggedFieldIds: (nodeId: Workflow.Node.Id) => Record<Foundations.Field.Id, boolean>,
}



// Reads an embedded dependency snapshot by its ref (used to resolve sub-workflows).
export interface DependencyAPI {
    get: <R extends Dependency.Ref>(ref: R) => Dependency.ValueFor<R>,
}
