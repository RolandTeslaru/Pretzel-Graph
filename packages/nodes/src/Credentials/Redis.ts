import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const Redis = defineCredential({
    id: "redis",
    displayName: "Redis",
    icon: "Redis",
    fields: [
        FieldBuilder.String  ({ id: "host",     displayName: "Host",           required: true, initialValue: "localhost" }),
        FieldBuilder.Integer ({ id: "port",     displayName: "Port",           required: true, initialValue: 6379 }),
        FieldBuilder.Password({ id: "password", displayName: "Password" }),
        FieldBuilder.Integer ({ id: "db",       displayName: "Database Index", initialValue: 0 }),
    ],
})
