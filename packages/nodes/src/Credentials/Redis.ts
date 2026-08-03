import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const Redis = defineCredential({
    id: "redis",
    displayName: "Redis",
    icon: "Redis",
    fields: [
        FieldBuilder.String("host", "Host", {
            required: true,
            initialValue: "localhost"
        }),
        FieldBuilder.Integer("port", "Port", {
            required: true,
            initialValue: 6379
        }),
        FieldBuilder.String("username", "Username", {
            placeholder: "default",
            tooltip: "Optional Redis ACL username."
        }),
        FieldBuilder.Password("password", "Password", {}),
        FieldBuilder.Integer("db", "Database Index", {
            initialValue: 0
        }),
        FieldBuilder.Boolean("tls", "Use TLS", {
            initialValue: false,
            tooltip: "Enable TLS for discrete host and port credentials. A rediss:// URL enables TLS automatically."
        }),
    ],
})
