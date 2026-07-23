import { defineCredential } from "../builders/credential";
import { FieldBuilder } from "../builders/field";
import { NetworkProxy } from "../domain/networkProxy";

// Auto-attached to every blueprint declaring `proxyCompatible`, the same way
// executionStrategyFields are appended to every blueprint's fields.
// `optional: true` — a node with no proxy is a valid node, not an incomplete one.
export const NetworkProxyCredential = defineCredential({
    id: NetworkProxy.TEMPLATE_ID,
    displayName: "Proxy",
    icon: "Globe",
    optional: true,
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
