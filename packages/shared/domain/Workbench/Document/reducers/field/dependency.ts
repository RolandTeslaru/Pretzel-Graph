import type { Dependency } from "../../../../Dependency"
import type { Foundations } from "../../../../Foundations"
import { Workflow } from "../../../../Workflow"
import type { Document } from "../../index"


export const fieldDependencyReducers: FieldDependencyReducers = {
    // Embeds the snapshot and points the field at it; the shape dependency field also reshapes the node.
    setValue: (d, nodeId, fieldId, ref, value) => {
        d.reducers.field.setValue(d, nodeId, fieldId, ref)
        d.reducers.dependency.register(d, ref, value)

        if (fieldId === Workflow.Node.SHAPE_DEPENDENCY_FIELD_ID)
            d.reducers.cache.resolvedShape.recreate(d, nodeId)

        d.reducers.node.validate(d, nodeId)
    }
}

export interface FieldDependencyReducers {
    setValue: (
        d:        Document,
        nodeId:   Workflow.Node.Id,
        fieldId:  Foundations.Field.Id,
        ref:      Dependency.Ref,
        value:    Dependency.Value
    ) => void
}
