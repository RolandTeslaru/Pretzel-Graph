import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const MySQL = defineCredential({
    id: "mysql",
    displayName: "MySQL",
    icon: "MySQL",
    fields: [
        FieldBuilder.String  ({ id: "host",     displayName: "Host",     required: true, initialValue: "localhost" }),
        FieldBuilder.Integer ({ id: "port",     displayName: "Port",     required: true, initialValue: 3306 }),
        FieldBuilder.String  ({ id: "database", displayName: "Database", required: true }),
        FieldBuilder.String  ({ id: "user",     displayName: "User",     required: true }),
        FieldBuilder.Password({ id: "password", displayName: "Password", required: true }),
        FieldBuilder.Boolean ({ id: "ssl",      displayName: "Use SSL",  initialValue: false }),
    ],
})
