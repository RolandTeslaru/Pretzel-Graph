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
