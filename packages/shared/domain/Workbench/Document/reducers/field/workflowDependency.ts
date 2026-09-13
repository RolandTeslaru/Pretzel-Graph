import type { Dependency } from "../../../../Dependency";
import { Workflow } from "../../../../Workflow";
import type { Foundations } from "../../../../Foundations";
import type { Document } from "../../index";

type NodeId  = Workflow.Node.Id
type FieldId = Foundations.Field.Id

export const fieldWorkflowDependencyReducers: FieldWorkflowDependencyReducers = {
    // Embeds the snapshot and points the field at it; the shape dependency field also reshapes the node.
    set: (d, nodeId, fieldId, mode, dependency) => {
        d.reducers.dependency.register(d, mode, dependency)

        const workflowId = mode === "draft"
            ? (dependency as Dependency.Value.Draft).id
            : (dependency as Dependency.Value.Publication).workflow_id

        const staticValues = d.reducers.node.ensureStaticValues(d, nodeId)
        staticValues[fieldId] = { workflowId, mode }

        if (fieldId === Workflow.Node.SHAPE_DEPENDENCY_FIELD_ID)
            d.reducers.cache.resolvedShape.recreate(d, nodeId)

        d.reducers.node.validate(d, nodeId)
        d.reducers.dependency.removeUnused(d)
        d.isDirty = true
    },
}

export interface FieldWorkflowDependencyReducers {
    set: (
        document:   Document,
        nodeId:     NodeId,
        fieldId:    FieldId,
        mode:       Dependency.Ref.Workflow["mode"],
        dependency: Dependency.Value.Publication | Dependency.Value.Draft,
    ) => void
}
