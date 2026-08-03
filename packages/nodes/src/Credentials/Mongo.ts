import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const Mongo = defineCredential({
    id: "mongoDb",
    displayName: "MongoDB",
    icon: "MongoDB",
    fields: [
        FieldBuilder.String("host", "Host", {
            required: true,
            initialValue: "localhost"
        }),
        FieldBuilder.Integer("port", "Port", {
            tooltip: "Leave blank for Atlas (mongodb+srv); enter a port only for a direct mongodb connection."
        }),
        FieldBuilder.String("database", "Database", {
            required: true
        }),
        FieldBuilder.String("user", "User", {
            required: true
        }),
        FieldBuilder.Password("password", "Password", {
            required: true
        }),
        FieldBuilder.Boolean("tls", "Use TLS", {
            initialValue: false
        }),
    ],
})
