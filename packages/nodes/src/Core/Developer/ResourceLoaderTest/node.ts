import { RegisterNode, RuntimeNode, InferInputs, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    public readonly Blueprint = Blueprint;

    // ── Mock loaders — replace with real DB calls when Postgres node is built ──

    static loaders: Record<string, RuntimeNode.LoaderFn> = {

        async schemaSearch({ searchQuery }) {
            const schemas = [
                { label: "public",             value: "public",             description: "Default schema" },
                { label: "information_schema", value: "information_schema", description: "SQL standard metadata views" },
                { label: "pg_catalog",         value: "pg_catalog",         description: "Postgres system catalog" },
                { label: "pg_toast",           value: "pg_toast",           description: "TOAST storage schema" },
            ];
            const q = searchQuery?.toLowerCase() ?? "";
            return {
                options: q ? schemas.filter(s => s.label.includes(q)) : schemas,
            };
        },

        async tableSearch({ fieldValues, searchQuery }) {
            const tablesBySchema: Record<string, RuntimeNode.LoaderResult["options"]> = {
                public: [
                    { label: "users",    value: "users",    description: "User accounts" },
                    { label: "sessions", value: "sessions", description: "Auth sessions" },
                    { label: "posts",    value: "posts",    description: "Blog posts" },
                    { label: "comments", value: "comments", description: "Post comments" },
                ],
                information_schema: [
                    { label: "tables",  value: "tables" },
                    { label: "columns", value: "columns" },
                    { label: "schemata", value: "schemata" },
                ],
                pg_catalog: [
                    { label: "pg_class",     value: "pg_class" },
                    { label: "pg_attribute", value: "pg_attribute" },
                    { label: "pg_type",      value: "pg_type" },
                ],
            };

            const schema = (fieldValues["schema"] as { value?: string } | undefined)?.value ?? "public";
            const tables = tablesBySchema[schema] ?? [{ label: `(no tables for schema "${schema}")`, value: "" }];
            const q = searchQuery?.toLowerCase() ?? "";
            return {
                options: q ? tables.filter(t => t.label.includes(q)) : tables,
            };
        },
    };

    // ── Execution ─────────────────────────────────────────────────────────────

    protected override async onRun(
        inputs: InferInputs<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const schema = this.fields.schema?.value ?? ""
        const table  = this.fields.table?.value  ?? ""
        console.log(`[ResourceLoaderTest] schema="${schema}" table="${table}"`);
        return { output: inputs.input };
    }
}
