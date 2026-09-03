import * as ApiMod from "./api"

export namespace Workbench {
    // Re-export the sub-module namespaces. `export import` carries the value,
    // the type, and nested members.
    export import API = ApiMod.API
}
