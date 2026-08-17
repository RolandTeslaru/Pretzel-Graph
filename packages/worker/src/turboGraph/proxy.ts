import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { NetworkProxy } from "@pretzel-graph/node-sdk";
import { Foundations, Vault, Workflow } from "@pretzel-graph/shared/domain";
import { System } from "@pretzel-graph/shared/system";
import { Encryption } from "@pretzel-graph/shared/server/vault/encryption";

// Connect timeout to the proxy itself. Axios's `timeout` only covers the response, so a dead
// proxy would otherwise hang past it.
const PROXY_CONNECT_TIMEOUT_MS = 15_000;


export const buildAgent = (config: NetworkProxy.Config): NetworkProxy.Agent => {

    const url = NetworkProxy.toUrl(config);

    const options = {
        keepAlive: true,
        timeout:   PROXY_CONNECT_TIMEOUT_MS,
    };

    // SOCKS sits below HTTP, so one agent serves both target schemes. Leave the hostname
    // unresolved — the agent defaults to remote DNS, which is the point of using it.
    if (config.protocol === "socks5") {

        const agent = new SocksProxyAgent(url, options);

        return { http: agent, https: agent };
    }

    // Node selects by TARGET scheme, not proxy scheme — an https-only agent would let an
    // http:// request silently bypass the proxy.
    return {
        http:  new HttpProxyAgent(url, options),
        https: new HttpsProxyAgent(url, options),
    };
};


export const destroyAgent = (agent: NetworkProxy.Agent): void => {

    agent.http.destroy();

    if (agent.https !== agent.http)
        agent.https.destroy();
};


const toConfig = (values: Vault.Credential.Instance.DecryptedValues): NetworkProxy.Config | null => {

    const read = (id: string) => values[id as Foundations.Field.Id];

    const protocol = String(read("protocol") ?? "http") as NetworkProxy.Protocol;
    const host     = String(read("host") ?? "").trim();
    const port     = Number(read("port"));

    if (!host || !Number.isInteger(port) || port < 1 || port > 65535)
        return null;

    const rawUser  = read("username");
    const username = rawUser ? String(rawUser) : undefined;

    return {
        protocol,
        host,
        port,
        username,
        password: username ? String(read("password") ?? "") : undefined,
    };
};


/** Execution-scoped registry. Agents are built lazily on first use and cached per credential
 *  instance, so nodes sharing a proxy share one pool. */
export function createProxyAPI(
    workflowData:        Workflow.Data,
    credentialInstances: Record<Vault.Credential.Instance.Id, Vault.Credential.Instance>,
): NetworkProxy.API {

    const agents = new Map<Vault.Credential.Instance.Id, NetworkProxy.Agent | null>();

    const getAgent = (instanceId: Vault.Credential.Instance.Id): NetworkProxy.Agent | undefined => {

        const cached = agents.get(instanceId);

        // null is cached too — a broken credential decrypts and logs once, not per call.
        if (cached !== undefined)
            return cached ?? undefined;

        let agent: NetworkProxy.Agent | null = null;

        try {
            const instance = credentialInstances[instanceId];
            const config   = instance && toConfig(Encryption.decryptBlob(instance.blob));

            if (config)
                agent = buildAgent(config);
            else
                System.log.warning("proxy credential unusable — node will connect directly", { instanceId });
        }
        catch (err) {
            // Never surface the cause: a decrypt/parse failure can carry credential material.
            System.log.error("proxy credential failed to resolve — node will connect directly", { instanceId });
        }

        agents.set(instanceId, agent);

        return agent ?? undefined;
    };

    return {

        getAgent,

        getAgentForNode: (nodeId) => {

            const instanceId = workflowData.credentialInstanceIds[nodeId]?.[NetworkProxy.TEMPLATE_ID];

            if (!instanceId)
                return undefined;

            return getAgent(instanceId);
        },

        destroyAll: () => {

            for (const agent of agents.values())
                if (agent)
                    destroyAgent(agent);

            agents.clear();
        },
    };
}
