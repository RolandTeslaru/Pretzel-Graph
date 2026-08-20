"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.destroyAgent = exports.buildAgent = void 0;
exports.createProxyAPI = createProxyAPI;
const http_proxy_agent_1 = require("http-proxy-agent");
const https_proxy_agent_1 = require("https-proxy-agent");
const socks_proxy_agent_1 = require("socks-proxy-agent");
const node_sdk_1 = require("../../../node-sdk/src/index.js");
const system_1 = require("../../../shared/system");
const credentials_1 = require("../credentials");
// Connect timeout to the proxy itself. Axios's `timeout` only covers the response, so a dead
// proxy would otherwise hang past it.
const PROXY_CONNECT_TIMEOUT_MS = 15_000;
const buildAgent = (config) => {
    const url = node_sdk_1.NetworkProxy.toUrl(config);
    const options = {
        keepAlive: true,
        timeout: PROXY_CONNECT_TIMEOUT_MS,
    };
    // SOCKS sits below HTTP, so one agent serves both target schemes. Leave the hostname
    // unresolved — the agent defaults to remote DNS, which is the point of using it.
    if (config.protocol === "socks5") {
        const agent = new socks_proxy_agent_1.SocksProxyAgent(url, options);
        return { http: agent, https: agent };
    }
    // Node selects by TARGET scheme, not proxy scheme — an https-only agent would let an
    // http:// request silently bypass the proxy.
    return {
        http: new http_proxy_agent_1.HttpProxyAgent(url, options),
        https: new https_proxy_agent_1.HttpsProxyAgent(url, options),
    };
};
exports.buildAgent = buildAgent;
const destroyAgent = (agent) => {
    agent.http.destroy();
    if (agent.https !== agent.http)
        agent.https.destroy();
};
exports.destroyAgent = destroyAgent;
const toConfig = (values) => {
    const read = (id) => values[id];
    const protocol = String(read("protocol") ?? "http");
    const host = String(read("host") ?? "").trim();
    const port = Number(read("port"));
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535)
        return null;
    const rawUser = read("username");
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
function createProxyAPI(workflowData, credentialInstances) {
    const agents = new Map();
    const getAgent = (instanceId) => {
        const cached = agents.get(instanceId);
        // null is cached too — a broken credential decrypts and logs once, not per call.
        if (cached !== undefined)
            return cached ?? undefined;
        let agent = null;
        try {
            const instance = credentialInstances[instanceId];
            const config = instance && toConfig((0, credentials_1.decryptCredentialBlob)(instance.blob));
            if (config)
                agent = (0, exports.buildAgent)(config);
            else
                system_1.System.log.warning("proxy credential unusable — node will connect directly", { instanceId });
        }
        catch (err) {
            // Never surface the cause: a decrypt/parse failure can carry credential material.
            system_1.System.log.error("proxy credential failed to resolve — node will connect directly", { instanceId });
        }
        agents.set(instanceId, agent);
        return agent ?? undefined;
    };
    return {
        getAgent,
        getAgentForNode: (nodeId) => {
            const instanceId = workflowData.credentialInstanceIds[nodeId]?.[node_sdk_1.NetworkProxy.TEMPLATE_ID];
            if (!instanceId)
                return undefined;
            return getAgent(instanceId);
        },
        destroyAll: () => {
            for (const agent of agents.values())
                if (agent)
                    (0, exports.destroyAgent)(agent);
            agents.clear();
        },
    };
}
