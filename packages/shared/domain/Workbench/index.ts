import * as ApiMod from "./api"
import * as DocumentMod from "./Document"
import * as EventMod from "./event"
import * as OperationsMod from "./Operations"

export namespace Workbench {
    // Re-export the sub-module namespaces. `export import` carries the value,
    // the type, and nested members.
    export import API        = ApiMod.API
    export import Document   = DocumentMod.Document
    export import Event      = EventMod.Event
    export import Operations = OperationsMod.Operations
}
