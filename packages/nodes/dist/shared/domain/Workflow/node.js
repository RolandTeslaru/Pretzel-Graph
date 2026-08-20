"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const zod_1 = require("zod");
const Blueprint_1 = require("../Foundations/Blueprint");
const Field_1 = require("../Foundations/Field");
const Port_1 = require("../Foundations/Port");
const ids_1 = require("./ids");
const resolvers_1 = require("./resolvers");
var Node;
(function (Node) {
    Node.Id = ids_1.NodeId;
    let DependencyRef;
    (function (DependencyRef) {
        DependencyRef.Schema = Blueprint_1.Blueprint.Meta.DependencyRef.Schema;
    })(DependencyRef = Node.DependencyRef || (Node.DependencyRef = {}));
    // The slim, persisted node — what lives in `data.nodes` and the store.
    let Raw;
    (function (Raw) {
        Raw.Schema = zod_1.z.object({
            id: Node.Id,
            blueprintId: zod_1.z.string().brand("BlueprintId"),
            isDisabled: zod_1.z.boolean().optional(),
            dependencyRef: Blueprint_1.Blueprint.Meta.DependencyRef.Schema.optional(),
            // Per-node presentation: view-state (minimized/flipped) + optional overrides of the
            // blueprint's ui (icon/accent/iconColor). All derived-on-read via node.getUI.
            ui: zod_1.z.object({
                description: zod_1.z.string().optional(),
                displayName: zod_1.z.string().optional(),
                isMinimized: zod_1.z.boolean().optional(),
                isFlipped: zod_1.z.boolean().optional(),
                icon: zod_1.z.string().optional(),
                accent: zod_1.z.string().optional(),
                iconColor: zod_1.z.string().optional(),
            }).default({}),
            reconciledBlueprintId: Blueprint_1.Blueprint.ReconciledId.optional(),
            polymorphicResolutions: zod_1.z.record(Port_1.Port.PolymorphicGroupId, Port_1.Port.Variant).optional(),
            addedInputs: zod_1.z.array(Port_1.Port.Input.Schema).optional(),
            addedOutputs: zod_1.z.array(Port_1.Port.Output.Schema).optional(),
            addedFields: zod_1.z.array(Field_1.Field.Schema).optional(),
        });
    })(Raw = Node.Raw || (Node.Raw = {}));
    // The read-time rich view — raw node + blueprint + resolved ports/fields. Never persisted.
    // Blueprint-level properties are NOT flattened in: read them off `.blueprint`, which is the
    // whole thing. (`dependencyRef`, `id` and `ui` live on Raw, so they stay on the node.)
    let Hydrated;
    (function (Hydrated) {
        Hydrated.Schema = Raw.Schema
            .omit({ addedInputs: true, addedOutputs: true, addedFields: true })
            .extend({
            blueprint: Blueprint_1.Blueprint.Schema,
            fields: zod_1.z.array(Field_1.Field.Schema),
            inputs: zod_1.z.array(Port_1.Port.Input.Schema),
            outputs: zod_1.z.array(Port_1.Port.Output.Schema),
            connectedPorts: zod_1.z.record(Port_1.Port.Input.Id, ids_1.EdgeId),
        });
    })(Hydrated = Node.Hydrated || (Node.Hydrated = {}));
    function createId(blueprintId) {
        return `${blueprintId}-${uid.randomUUID(5)}`;
    }
    Node.createId = createId;
    // Live port resolution for a slim node (base blueprint ports + resolutions, or a
    // subworkflow's exposed ports when a dependency is passed). Impl in ./resolvers.
    Node.resolveInputs = resolvers_1.resolveInputs;
    Node.resolveOutputs = resolvers_1.resolveOutputs;
})(Node || (exports.Node = Node = {}));
const uid = {
    randomUUID: (length) => Math.random().toString(36).substring(2, 2 + length)
};
