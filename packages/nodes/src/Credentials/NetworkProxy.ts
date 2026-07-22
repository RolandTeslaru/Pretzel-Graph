import { defineCredential, FieldBuilder, NetworkProxy as NetworkProxyDomain } from "@pretzel-graph/node-sdk"

// Universal credential — not declared on any blueprint. Attached to a node directly so all of
// that node's outbound HTTP is tunnelled through the proxy.
export const NetworkProxy = defineCredential({
    id: NetworkProxyDomain.TEMPLATE_ID,
    displayName: "Proxy",
    icon: "Globe",
    fields: [
        FieldBuilder.MultiOption({
            id: "protocol",
            displayName: "Protocol",
            initialValue: "http",
            options: [
                { value: "http",   displayName: "HTTP",    description: "CONNECT tunnel. Works for https targets." },
                { value: "https",  displayName: "HTTPS",   description: "As HTTP, but the hop to the proxy is itself TLS." },
                { value: "socks5", displayName: "SOCKS5",  description: "What most residential/geo providers issue." },
            ],
        }),
        FieldBuilder.String  ({ id: "host",     displayName: "Host",     required: true, placeholder: "proxy.provider.com" }),
        FieldBuilder.Integer ({ id: "port",     displayName: "Port",     required: true, initialValue: 8080, min: 1, max: 65535 }),
        FieldBuilder.String  ({ id: "username", displayName: "Username" }),
        FieldBuilder.Password({ id: "password", displayName: "Password" }),
    ],
})
