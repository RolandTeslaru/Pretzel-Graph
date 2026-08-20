"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Data = void 0;
const zod_1 = require("zod");
const Field_1 = require("../Foundations/Field");
const node_1 = require("./node");
const edge_1 = require("./edge");
const Port_1 = require("../Foundations/Port");
const ids_1 = require("./ids");
const Vault_1 = require("../Vault");
const dependency_1 = require("./dependency");
const migrate_1 = require("./migrate");
var Data;
(function (Data) {
    let Layout;
    (function (Layout) {
        Layout.Schema = zod_1.z.record(node_1.Node.Id, zod_1.z.object({
            x: zod_1.z.number(),
            y: zod_1.z.number(),
        }));
    })(Layout = Data.Layout || (Data.Layout = {}));
    let Viewport;
    (function (Viewport) {
        Viewport.Schema = zod_1.z.object({
            x: zod_1.z.number(),
            y: zod_1.z.number(),
            zoom: zod_1.z.number(),
        });
    })(Viewport = Data.Viewport || (Data.Viewport = {}));
    const ObjectSchema = zod_1.z.object({
        version: zod_1.z.number().default(migrate_1.WORKFLOW_DATA_VERSION),
        fields: zod_1.z.array(Field_1.Field.Schema).default([]), //config
        nodes: zod_1.z.record(node_1.Node.Id, node_1.Node.Raw.Schema),
        // Id-only: an edge id fully encodes its endpoints (source|port|target|port), so the fat
        // {source, target} form is derived into the cache on read. Migrated from the legacy record.
        edges: zod_1.z.array(edge_1.Edge.Id),
        staticValues: zod_1.z.record(node_1.Node.Id, zod_1.z.record(zod_1.z.union([Field_1.Field.Id, Port_1.Port.Input.Id]), zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.array(zod_1.z.string()), zod_1.z.json()]))),
        // Per-node override of a field's static/expression mode — the user's Static/Expression
        // toggle. Absent means "no choice made": fall back to the blueprint's
        // `isExpressionInitially`. Resolved through Field.usesExpression, never read directly.
        fieldExpressions: zod_1.z.record(node_1.Node.Id, zod_1.z.record(Field_1.Field.Id, zod_1.z.boolean())).default({}),
        credentialInstanceIds: zod_1.z.record(node_1.Node.Id, zod_1.z.record(Vault_1.Vault.Credential.Template.Id, Vault_1.Vault.Credential.Instance.Id)).default({}),
        // Editor-only layout/viewport. Dropped from dependency snapshots (executed, not rendered),
        // so it must default when absent.
        ui: zod_1.z.object({
            layout: Layout.Schema,
            viewport: Viewport.Schema,
            icon_color: zod_1.z.string().nullable().optional(),
        }).default({ layout: {}, viewport: { x: 0, y: 0, zoom: 1 } }),
        // Getters defer the Dependency <-> Data cycle; the z.ZodType anchors
        // are required because TS can't infer through mutual recursion.
        dependencies: zod_1.z.object({
            get published() {
                return zod_1.z.record(ids_1.WorkflowId, dependency_1.Dependency.Publication.Schema).default({});
            },
            get draft() {
                return zod_1.z.record(ids_1.WorkflowId, dependency_1.Dependency.Draft.Schema).default({});
            },
        }).default({ published: {}, draft: {} }),
    });
    // Migrate legacy (fat-node) blobs to the latest slim shape before validation. The migrate
    // fn sees the raw object, so v1 ports/fields survive long enough to be relocated/dropped.
    Data.Schema = zod_1.z.preprocess(migrate_1.migrateWorkflowDataToLatest, ObjectSchema);
})(Data || (exports.Data = Data = {}));
