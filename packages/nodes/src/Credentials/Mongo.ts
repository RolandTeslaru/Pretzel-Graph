import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk"

export const Mongo = defineCredential({
    id: "mongoDb",
    displayName: "MongoDB",
    icon: "MongoDB",
    fields: [
        FieldBuilder.String  ({ id: "host",     displayName: "Host",     required: true, initialValue: "localhost" }),
        FieldBuilder.Integer ({ id: "port",     displayName: "Port",     initialValue: 27017, tooltip: "Leave blank for a mongodb+srv (Atlas) connection." }),
        FieldBuilder.String  ({ id: "database", displayName: "Database", required: true }),
        FieldBuilder.String  ({ id: "user",     displayName: "User",     required: true }),
        FieldBuilder.Password({ id: "password", displayName: "Password", required: true }),
        FieldBuilder.Boolean ({ id: "tls",      displayName: "Use TLS",  initialValue: false }),
    ],
})
