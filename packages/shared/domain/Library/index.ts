import { Workflow as WorkflowD } from "../Workflow"
import * as FolderMod from "./folder"
import * as ApiMod from "./api"
import * as RefMod from "./ref"

export namespace Library {
    export import Folder = FolderMod.Folder
    export import Ref = RefMod.Ref

    export namespace WorkflowMeta {
        export const Schema = WorkflowD.Meta.Schema
    }
    export type WorkflowMeta = WorkflowD.Meta

    export import API = ApiMod.API
}
