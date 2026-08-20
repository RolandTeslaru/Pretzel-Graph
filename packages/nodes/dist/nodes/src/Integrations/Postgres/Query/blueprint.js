"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const Postgres_1 = require("../../../Credentials/Postgres");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Integrations.Postgres.Query",
    displayName: "Postgres",
    description: "Runs operations against a Postgres database.",
    icon: "Postgres",
    accent: "utility",
    credentials: [Postgres_1.Postgres],
    fields: [
        node_sdk_1.FieldBuilder.String("query", "Query", {
            multiline: true,
            initialValue: "SELECT * FROM ",
            placeholder: "SELECT * FROM ...",
            tooltip: "SQL executed against the connected database."
        }),
    ],
    inputs: [],
    outputs: [
        node_sdk_1.OutputBuilder.DataList("rows", "Rows", {
            tooltip: "Result rows returned by the query — one item per row."
        }),
    ],
});
