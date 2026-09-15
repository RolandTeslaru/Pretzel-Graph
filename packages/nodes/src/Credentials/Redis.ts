import { defineCredential, defineField } from "@pretzel-graph/node-sdk"

export const Redis = defineCredential({
    id: "redis",
    displayName: "Redis",
    icon: "Redis",
    fields: [
        defineField.String("host", "Host", {
            required: true,
            initialValue: "localhost"
        }),
        defineField.Integer("port", "Port", {
            required: true,
            initialValue: 6379
        }),
        defineField.String("username", "Username", {
            placeholder: "default",
            tooltip: "Optional Redis ACL username."
        }),
        defineField.Password("password", "Password", {}),
        defineField.Integer("db", "Database Index", {
            initialValue: 0
        }),
        defineField.Boolean("tls", "Use TLS", {
            initialValue: false,
            tooltip: "Enable TLS for discrete host and port credentials. A rediss:// URL enables TLS automatically."
        }),
    ],
})
