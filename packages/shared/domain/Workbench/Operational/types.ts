import type { Foundations } from "../../Foundations"
import type { Workflow } from "../../Workflow"
import type { Document } from "../Document"
import type { Event } from "../event"

export type Position   = { x: number, y: number }
export type Connection = Document.DriverConnection

export type BlueprintResolver = (blueprintId: Foundations.Blueprint.Id) => Promise<Foundations.Blueprint>
export type OnOperation       = (edit: Event.Unstamped) => void

export interface CreateNodeRequest {
    blueprintId:   Foundations.Blueprint.Id
    /** Omitted: placed to the right of the rightmost node. */
    position?:     Position
    staticValues?: Record<string, unknown>
}

export type Operation =
    | ({ op: "node.create" }          & CreateNodeRequest)
    | { op: "node.delete";          nodeId: Workflow.Node.Id }
    | { op: "node.move";            nodeId: Workflow.Node.Id; position: Position }
    | { op: "node.addInputPort";    nodeId: Workflow.Node.Id; port: InputPortSpec }
    | { op: "node.removeInputPort"; nodeId: Workflow.Node.Id; portId: Foundations.Port.Input.Id }
    | ({ op: "edge.create" }          & Connection)
    | { op: "edge.delete";          edgeId: Workflow.Edge.Id }
    | { op: "field.set";            nodeId: Workflow.Node.Id; fieldId: Foundations.Field.Id; value: unknown }
    | ({ op: "globalField.add" }      & GlobalFieldSpec)
    | { op: "globalField.update";   fieldId: Foundations.Field.Id; patch: Partial<Omit<GlobalFieldSpec, "id">> }
    | { op: "globalField.remove";   fieldId: Foundations.Field.Id }

/** A hand-added input port: a concrete type, never an unresolved one, since it belongs to no group. */
export interface InputPortSpec {
    id:          Foundations.Port.Input.Id
    displayName: string
    variant:     Foundations.Port.Variant
    required?:   boolean
}

export type GlobalFieldVariant = "String" | "Boolean" | "Integer" | "Float"

export interface GlobalFieldSpec {
    id:            Foundations.Field.Id
    displayName:   string
    variant:       GlobalFieldVariant
    required?:     boolean
    tooltip?:      string
    initialValue?: string | number | boolean
    min?:          number
    max?:          number
    multiline?:    boolean
}
