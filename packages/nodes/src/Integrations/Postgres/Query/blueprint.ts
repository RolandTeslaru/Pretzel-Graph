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
