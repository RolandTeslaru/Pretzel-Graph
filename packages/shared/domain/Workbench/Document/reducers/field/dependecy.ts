import { Workbench } from "../../.."
import { Dependency } from "../../../../Dependency"
import { Foundations } from "../../../../Foundations"
import { Workflow } from "../../../../Workflow"


export const fieldDependencyReducers: FieldDependencyReducers = {
    setValue: (
        d, nodeId, fieldId, kind, value
    ) => {
        d.reducers.dependency.register(d, kind, value)

        const depRef: Dependency.Ref = { kind, id: value } 

        d.reducers.field.setValue(d, nodeId, fieldId, depRef)

        if (fieldId === Workflow.Node.SHAPE_DEPENDENCY_FIELD_ID)
            d.reducers.cache.resolvedShape.recreate(d, nodeId)
    }
}

export interface FieldDependencyReducers {
    setValue: (
        d:        Workbench.Document, 
        nodeId:   Workflow.Node.Id, 
        fieldId:  Foundations.Field.Id, 
        kind:     Dependency.Ref["kind"], 
        refValue: Dependency.Ref["workflowId"]
    ) => void 
}