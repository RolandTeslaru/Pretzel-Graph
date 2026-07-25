import { defineBlueprint, FieldBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";
import { Postgres } from "@pretzel-graph/nodes/Credentials/Postgres";

export const Blueprint = defineBlueprint({
    id: "Integrations.Postgres.Query",
    displayName: "Postgres",
    description: "Runs operations against a Postgres database.",
    icon: "Postgres",
    accent: "utility",
    credentials: [Postgres],
    fields: [
        // The operation drives the node's field schema via reconcile. Only "executeQuery"
        // exists for now (needs just the query field). Future operations — select / insert /
        // update / upsert / delete — will reconcile in schema / table ResourceLoader fields.
        FieldBuilder.reconciling(FieldBuilder.MultiOption("operation", "Operation", {
            options: [
                { value: "executeQuery", displayName: "Execute Query" },
            ],

            initialValue: "executeQuery",
            tooltip: "What this node does against the database."
        })),
        FieldBuilder.String("query", "Query", {
            multiline: true,
            initialValue: "SELECT * FROM ",
            placeholder: "SELECT * FROM ...",
            tooltip: "SQL executed against the connected database."
        }),
    ],
    inputs: [],
    outputs: [
        OutputBuilder.DataList("rows", "Rows", {
            tooltip: "Result rows returned by the query — one item per row."
        }),
    ],
});
