import type { Gateway } from "@pretzel-graph/shared/domain";
import type { HostContext } from "./host";

export interface SocketContext extends HostContext {
    readonly connection: Gateway.Connection,
}
