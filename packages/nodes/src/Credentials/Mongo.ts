import { defineCredential, defineField } from "@pretzel-graph/node-sdk"

export const Mongo = defineCredential({
    id: "mongoDb",
    displayName: "MongoDB",
    icon: "MongoDB",
    fields: [
        defineField.String("host", "Host", {
            required: true,
            initialValue: "localhost"
        }),
        defineField.Integer("port", "Port", {
            tooltip: "Leave blank for Atlas (mongodb+srv); enter a port only for a direct mongodb connection."
        }),
        defineField.String("database", "Database", {
            required: true
        }),
        defineField.String("user", "User", {
            required: true
        }),
        defineField.Password("password", "Password", {
            required: true
        }),
        defineField.Boolean("tls", "Use TLS", {
            initialValue: false
        }),
    ],
})
