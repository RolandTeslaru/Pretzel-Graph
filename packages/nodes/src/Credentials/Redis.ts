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
        FieldBuilder.Password("password", "Password", {}),
        FieldBuilder.Integer("db", "Database Index", {
            initialValue: 0
        }),
    ],
})
