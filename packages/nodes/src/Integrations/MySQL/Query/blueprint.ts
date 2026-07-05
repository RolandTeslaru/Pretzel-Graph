import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { MySQL } from "@pretzel-graph/nodes/Credentials/MySQL";

export const Blueprint = defineBlueprint({
    id: "Integrations.MySQL.Query",
    displayName: "MySQL",
    description: "Runs operations against a MySQL database.",
    icon: "MySQL",
    accent: "utility",
    credentials: [MySQL],
    fields: [
        // The operation drives the node's field schema via reconcile. Only "executeQuery"
        // exists for now (needs just the query field). Future operations — select / insert /
        // update / upsert / delete — will reconcile in schema / table ResourceLoader fields.
        FieldBuilder.reconciling(FieldBuilder.MultiOption({
            id: "operation",
            displayName: "Operation",
            options: [
                { value: "executeQuery", displayName: "Execute Query" },
            ],
            initialValue: "executeQuery",
            tooltip: "What this node does against the database.",
        })),
        FieldBuilder.String({
            id: "query",
            displayName: "Query",
            multiline: true,
            initialValue: "SELECT * FROM ",
            placeholder: "SELECT * FROM ...",
            tooltip: "SQL executed against the connected database.",
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.DataList({
            id: "rows",
            displayName: "Rows",
            tooltip: "Result rows returned by the query — one item per row.",
        }),
    ],
});
