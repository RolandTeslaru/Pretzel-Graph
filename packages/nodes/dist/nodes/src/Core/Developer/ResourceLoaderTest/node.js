"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    // ── Mock loaders — replace with real DB calls when Postgres node is built ──
    static loaders = (0, node_sdk_1.defineLoaders)()({
        async schemaSearch({ searchQuery }) {
            const schemas = [
                { label: "public", value: "public", description: "Default schema" },
                { label: "information_schema", value: "information_schema", description: "SQL standard metadata views" },
                { label: "pg_catalog", value: "pg_catalog", description: "Postgres system catalog" },
                { label: "pg_toast", value: "pg_toast", description: "TOAST storage schema" },
            ];
            const q = searchQuery?.toLowerCase() ?? "";
            return {
                options: q ? schemas.filter(s => s.label.includes(q)) : schemas,
            };
        },
        async tableSearch({ fieldValues, searchQuery }) {
            const tablesBySchema = {
                public: [
                    { label: "users", value: "users", description: "User accounts" },
                    { label: "sessions", value: "sessions", description: "Auth sessions" },
                    { label: "posts", value: "posts", description: "Blog posts" },
                    { label: "comments", value: "comments", description: "Post comments" },
                ],
                information_schema: [
                    { label: "tables", value: "tables" },
                    { label: "columns", value: "columns" },
                    { label: "schemata", value: "schemata" },
                ],
                pg_catalog: [
                    { label: "pg_class", value: "pg_class" },
                    { label: "pg_attribute", value: "pg_attribute" },
                    { label: "pg_type", value: "pg_type" },
                ],
            };
            const schema = fieldValues.schema?.value ?? "public";
            const tables = tablesBySchema[schema] ?? [{ label: `(no tables for schema "${schema}")`, value: "" }];
            const q = searchQuery?.toLowerCase() ?? "";
            return {
                options: q ? tables.filter(t => t.label.includes(q)) : tables,
            };
        },
    });
    // ── Execution ─────────────────────────────────────────────────────────────
    async onRun(incoming) {
        const schema = this.fieldValues.schema?.value ?? "";
        const table = this.fieldValues.table?.value ?? "";
        console.log(`[ResourceLoaderTest] schema="${schema}" table="${table}"`);
        return { output: incoming.input };
    }
}
exports.Node = Node;
