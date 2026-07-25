import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const Postgres = defineCredential({
    id: "postgres",
    displayName: "Postgres",
    icon: "Postgres",
    fields: [
        FieldBuilder.String("host", "Host", {
            required: true,
            initialValue: "localhost"
        }),
        FieldBuilder.Integer("port", "Port", {
            required: true,
            initialValue: 5432
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
        FieldBuilder.Boolean("ssl", "Use SSL", {
            initialValue: false
        }),
    ],
})
