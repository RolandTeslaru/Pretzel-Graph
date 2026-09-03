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
    const setDocument = sdk.setDocument;
    const reducers = sdk.reducers;
    const sel      = sdk.selectors;

    return {
        addEntry: withCommit((nodeId, fieldId, label) => {
            const portId = Port.Output.Id.parse(crypto.randomUUID())
            const entry  = Field.CaseList.createEntry(portId, label)

            setDocument(d => {
                reducers.field.caseList.addEntry(d, nodeId, fieldId, entry)

                const resolvedVariant = sel.port.polymorphism.getResolvedVariantInGroup(d, nodeId, "condition") ?? "Unresolved"

                reducers.port.addOutput(d, nodeId, {
                    id: portId,
                    displayName: label,
                    variant: resolvedVariant,
                    polymorphicGroupId: "condition" as Port.PolymorphicGroupId,
                })
            })

            validateFieldById(nodeId, fieldId)
        }),

        removeEntry: withCommit((nodeId, fieldId, portId) => {
            setDocument(d => {
                reducers.field.caseList.removeEntry(d, nodeId, fieldId, portId)
                reducers.port.removeOutput(d, nodeId, portId)
            })
            validateFieldById(nodeId, fieldId)
        }),

        setLabel: withCommit((nodeId, fieldId, portId, label) => {
            setDocument(d => {
                reducers.field.caseList.setLabel(d, nodeId, fieldId, portId, label)
                reducers.port.setOutputDisplayName(d, nodeId, portId, label)
            })
            validateFieldById(nodeId, fieldId)
        }),

        setValue: withCommit((nodeId, fieldId, portId, value) => {
            setDocument(d => { reducers.field.caseList.setValue(d, nodeId, fieldId, portId, value) })
            validateFieldById(nodeId, fieldId)
        }),

        setIsExpression: withCommit((nodeId, fieldId, portId, isExpression) => {
            setDocument(d => { reducers.field.caseList.setIsExpression(d, nodeId, fieldId, portId, isExpression) })
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
