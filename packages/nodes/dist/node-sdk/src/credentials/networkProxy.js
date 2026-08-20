"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkProxyCredential = void 0;
const credential_1 = require("../builders/credential");
const field_1 = require("../builders/field");
const networkProxy_1 = require("../domain/networkProxy");
// Auto-attached to every blueprint declaring `proxyCompatible`, the same way
// DEFAULT_FIELDS are appended to every blueprint's fields.
// `optional: true` — a node with no proxy is a valid node, not an incomplete one.
exports.NetworkProxyCredential = (0, credential_1.defineCredential)({
    id: networkProxy_1.NetworkProxy.TEMPLATE_ID,
    displayName: "Proxy",
    icon: "NetworkProxy",
    optional: true,
    fields: [
        field_1.FieldBuilder.MultiOption("protocol", "Protocol", {
            initialValue: "http",
            options: [
                { value: "http", displayName: "HTTP", description: "CONNECT tunnel. Works for https targets." },
                { value: "https", displayName: "HTTPS", description: "As HTTP, but the hop to the proxy is itself TLS." },
                { value: "socks5", displayName: "SOCKS5", description: "What most residential/geo providers issue." },
            ],
        }),
        field_1.FieldBuilder.String("host", "Host", { required: true, placeholder: "proxy.provider.com" }),
        field_1.FieldBuilder.Integer("port", "Port", { required: true, initialValue: 8080, min: 1, max: 65535 }),
        field_1.FieldBuilder.String("username", "Username"),
        field_1.FieldBuilder.Password("password", "Password"),
    ],
});
