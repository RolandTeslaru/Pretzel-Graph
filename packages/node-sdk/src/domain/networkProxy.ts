import type { Agent as NodeAgent } from "node:http";
import type { Vault, Workflow } from "@pretzel-graph/shared/domain";

declare const urlBrand: unique symbol;

export namespace NetworkProxy {

    /** The universal proxy credential — declared on no blueprint, attachable to any node.
     *  Defined in nodes/src/Credentials/NetworkProxy.ts; this is the key it occupies in
     *  `Workflow.Data.credentialInstanceIds[nodeId]`. */
    export const TEMPLATE_ID = "networkProxy" as Vault.Credential.Template.Id;

    /** socks5 is transport-level, so it can tunnel any TCP protocol (HTTP, Postgres, Redis…);
     *  http/https proxies only carry HTTP traffic. */
    export type Protocol = "http" | "https" | "socks5";

    /** Decrypted projection of the `proxy` Vault credential template. */
    export interface Config {
        protocol:  Protocol,
        host:      string,
        port:      number,
        /** Omitted when the provider authenticates by IP allowlist instead of credentials. */
        username?: string,
        password?: string,
    }

    /** `scheme://user:pass@host:port`, as the agent libraries expect it.
     *
     *  Branded because once auth is present this string IS a live credential — it must never be
     *  logged, put in an error message, or handed anywhere but an agent constructor. */
    export type URL = string & { readonly [urlBrand]: "NetworkProxyUrl" };

    // encodeURIComponent because provider passwords routinely contain : @ / #.
    export const toUrl = ({ protocol, host, port, username, password }: Config): URL => {

        const auth = username
            ? `${encodeURIComponent(username)}:${encodeURIComponent(password ?? "")}@`
            : "";

        return `${protocol}://${auth}${host}:${port}` as URL;
    };

    /** Live connection pools. Node picks by target scheme, not proxy scheme, so both are always
     *  set — socks5 puts the same instance in each. Build once per Config and share across every
     *  client that routes through it; a pool per client defeats keep-alive. */
    export interface Agent {
        http:  NodeAgent,
        https: NodeAgent,
    }

    /** Execution-scoped registry, keyed internally by credential instance so nodes sharing a
     *  proxy share its pool.
     *
     *  Internal plumbing — nodes must NOT call this directly. `RuntimeNode.http` resolves the
     *  agent transparently so a node cannot forget to route through its attached proxy. */
    export interface API {
        /** Built on first call and cached, so nodes sharing an instance share one pool. */
        getAgent: (instanceId: Vault.Credential.Instance.Id) => Agent | undefined,
        /** Resolves the node's attached instance, then defers to getAgent. Undefined when the
         *  node has no proxy attached — the common case. */
        getAgentForNode: (nodeId: Workflow.Node.Id) => Agent | undefined,
        /** Closes pooled keep-alive sockets. Must run at execution teardown or FDs leak. */
        destroyAll: () => void,
    }
}
