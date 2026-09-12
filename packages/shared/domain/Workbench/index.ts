import * as ApiMod from "./api"
import * as DocumentMod from "./Document"
import * as EventMod from "./event"
import * as OperationalMod from "./Operational"

export namespace Workbench {
    // Re-export the sub-module namespaces. `export import` carries the value,
    // the type, and nested members.
    export import API      = ApiMod.API
    export import Document = DocumentMod.Document
    export import Event    = EventMod.Event
    export import Summary  = OperationalMod.Summary

    export const OperationalClient = OperationalMod.OperationalClient
    export type  OperationalClient = OperationalMod.OperationalClient

    export type Operation         = OperationalMod.Operation
    export type BlueprintResolver = OperationalMod.BlueprintResolver
    export type OnOperation       = OperationalMod.OnOperation
    export type CreateNodeRequest = OperationalMod.CreateNodeRequest
    export type InputPortSpec     = OperationalMod.InputPortSpec
    export type GlobalFieldSpec   = OperationalMod.GlobalFieldSpec
}
