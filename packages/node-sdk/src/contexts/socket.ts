import type { Gateway } from "@pretzel-graph/shared/domain";
import type { HostContext } from "./host";

export interface SocketContext extends HostContext {
    readonly connection: Gateway.Connection,
    // Hands an event to everything listening on this connection.
    readonly dispatch:   (event: Gateway.Socket.Event) => void,
    // Reports that the socket has given up for good; drops it recovers from itself are not reported.
    readonly fail:       (error: Error) => void,
    // Reports which remote account the socket authenticated as, once the handshake says.
    readonly identify:   (remoteId: string) => void,
}
