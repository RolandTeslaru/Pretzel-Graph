import type { WorkbenchSDKImpl } from "../../sdk";
import { withCommit } from "../../utils/actions";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import type { Workflow } from "@pretzel-graph/shared/domain";

type NodeId    = Workflow.Node.Id
type FieldId   = Field.Id
type PortId    = Port.Output.Id
type EntryValue = Field.CaseList.Entry["value"]

export function createCaseListActions(
    sdk: WorkbenchSDKImpl,
    validateFieldById: (nodeId: NodeId, fieldId: FieldId) => void
) {
    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;
    const sel      = sdk.selectors;

    return {
        addEntry: withCommit((nodeId, fieldId, label) => {
            const portId = Port.Output.Id.parse(crypto.randomUUID())
            const entry  = Field.CaseList.createEntry(portId, label)

            setState(s => {
                reducers.field.caseList.addEntry(s, nodeId, fieldId, entry)

                const resolvedVariant = sel.port.polymorphism.getResolvedVariantInGroup(s, nodeId, "condition") ?? "Unresolved"

                reducers.port.addOutput(s, nodeId, {
                    id: portId,
                    displayName: label,
                    variant: resolvedVariant,
                    polymorphicGroupId: "condition",
                    originalVariant: "Unresolved",
                })
            })

            validateFieldById(nodeId, fieldId)
        }),

        removeEntry: withCommit((nodeId, fieldId, portId) => {
            setState(s => {
                reducers.field.caseList.removeEntry(s, nodeId, fieldId, portId)
                reducers.port.removeOutput(s, nodeId, portId)
            })
            validateFieldById(nodeId, fieldId)
        }),

        setLabel: withCommit((nodeId, fieldId, portId, label) => {
            setState(s => {
                reducers.field.caseList.setLabel(s, nodeId, fieldId, portId, label)
                reducers.port.setOutputDisplayName(s, nodeId, portId, label)
            })
            validateFieldById(nodeId, fieldId)
        }),

        setValue: withCommit((nodeId, fieldId, portId, value) => {
            setState(s => { reducers.field.caseList.setValue(s, nodeId, fieldId, portId, value) })
            validateFieldById(nodeId, fieldId)
        }),

        setIsExpression: withCommit((nodeId, fieldId, portId, isExpression) => {
            setState(s => { reducers.field.caseList.setIsExpression(s, nodeId, fieldId, portId, isExpression) })
            validateFieldById(nodeId, fieldId)
        }),
    } satisfies CaseListActions
}


export interface CaseListActions {
    addEntry      : (nodeId: NodeId, fieldId: FieldId, label: string) => void
    removeEntry   : (nodeId: NodeId, fieldId: FieldId, portId: PortId) => void
    setLabel      : (nodeId: NodeId, fieldId: FieldId, portId: PortId, label: string) => void
    setValue      : (nodeId: NodeId, fieldId: FieldId, portId: PortId, value: EntryValue) => void
    setIsExpression: (nodeId: NodeId, fieldId: FieldId, portId: PortId, isExpression: boolean) => void
}
