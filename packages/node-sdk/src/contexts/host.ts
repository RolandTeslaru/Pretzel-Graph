import type { Log } from "@pretzel-graph/shared/system";
import type { ConnectionAPI, CredentialsAPI } from "../apis/resources";

// What any host grants whatever it is running — no execution, no workflow, no engine.
// The worker and the backend each satisfy this their own way.
export interface HostContext {
    readonly credentialsAPI: CredentialsAPI,
    readonly connectionAPI:  ConnectionAPI,
    readonly log:            Log,
}
