import { defineCredential, defineField } from "@pretzel-graph/node-sdk"

export const Postgres = defineCredential({
    id: "postgres",
    displayName: "Postgres",
    icon: "Postgres",
    fields: [
        defineField.String("host", "Host", {
            required: true,
            initialValue: "localhost"
        }),
        defineField.Integer("port", "Port", {
            required: true,
            initialValue: 5432
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
        defineField.Boolean("ssl", "Use SSL", {
            initialValue: false
        }),
    ],
})
