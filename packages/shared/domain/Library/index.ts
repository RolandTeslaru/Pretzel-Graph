import { Workflow as WorkflowD } from "../Workflow"
import * as FolderMod from "./folder"
import * as ApiMod from "./api"

export namespace Library {
    export import Folder = FolderMod.Folder

    export namespace WorkflowMeta {
        export const Schema = WorkflowD.Meta.Schema
    }
    export type WorkflowMeta = WorkflowD.Meta

    export import API = ApiMod.API
}
