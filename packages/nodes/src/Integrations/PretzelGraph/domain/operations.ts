import { CatalogueService } from "@pretzel-graph/node-sdk";
import { Foundations, Workbench, Workflow } from "@pretzel-graph/shared/domain";

type Document   = Workbench.Document;
type Position   = { x: number, y: number };
type Connection = Workbench.Document.DriverConnection;

const { withCyclesRecompute } = Workbench.Document;

// What can be asked of a workflow document, in the terms a caller uses — a node today, an
// agent's tools tomorrow. Shaped like the canvas's actions: a namespace per target, a method
// per operation, the document first. Reads never lock; writes run inside a session.
//
// Writes mirror what the canvas does around a reducer — derive on a reconciling field,
// validate, recompute cycles once edges moved — so a headless edit lands in the same state a
// human's would. Reads return projections, not dumps.
export const Operations = {
    workflow: {
        get: (d: Document) => ({
            id: d.workflowId,
            nodes: Object.values(d.data.nodes).map(node => ({
                id:          node.id,
                blueprintId: node.blueprintId,
                displayName: d.selectors.node.getUI(d, node.id).displayName,
                isDisabled:  node.isDisabled ?? false,
            })),
            edges: Object.values(d.cache.edges).map(edge => ({
                id:     edge.id,
                source: edge.source,
                target: edge.target,
            })),
            issues: d.issues,
        }),
    },

    node: {
        get: (d: Document, nodeId: Workflow.Node.Id) => {
            const node = d.data.nodes[nodeId];
            if (!node)
                throw new Error(`Node ${nodeId} not found`);

            const shape = d.cache.resolvedShape[nodeId];

            return {
                node,
                fields:       shape?.fields  ?? [],
                inputs:       shape?.inputs  ?? [],
                outputs:      shape?.outputs ?? [],
                staticValues: d.selectors.node.getStaticValues(d, nodeId),
                issues:       d.issues.nodes[nodeId] ?? null,
            };
        },

        create: withCyclesRecompute((d: Document, blueprintId: Foundations.Blueprint.Id, position: Position, staticValues?: Record<string, unknown>) => {
            const blueprint = CatalogueService.getBlueprint(blueprintId);
            if (!blueprint)
                throw new Error(`Blueprint ${blueprintId} not found`);

            const nodeId = d.reducers.node.create(d, blueprint, position, staticValues as never);
            return { nodeId, issues: d.issues.nodes[nodeId] ?? null };
        }),

        delete: withCyclesRecompute((d: Document, nodeId: Workflow.Node.Id) => {
            d.reducers.node.remove(d, nodeId);
            return { nodeId };
        }),
    },

    edge: {
        create: withCyclesRecompute((d: Document, connection: Connection) => {
            const edge = d.reducers.edge.create(d, connection);
            if (!edge)
                throw new Error("Edge not created: a port was not found or the types do not match");

            return { edgeId: edge.id };
        }),

        delete: withCyclesRecompute((d: Document, edgeId: Workflow.Edge.Id) => {
            d.reducers.edge.remove(d, edgeId);
            return { edgeId };
        }),
    },

    field: {
        get: (d: Document, nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id) => ({
            value: d.selectors.node.getStaticValue(d, nodeId, fieldId),
        }),

        set: withCyclesRecompute((d: Document, nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id, value: unknown) => {
            const field = d.selectors.field.get(d, nodeId, fieldId);
            if (!field)
                throw new Error(`Field ${fieldId} not found on node ${nodeId}`);

            // A reconciling field reshapes the node; what that added, removed, and disconnected
            // comes back so the caller can see the cost of the change.
            const derivation = field.reconcile
                ? d.reducers.node.derive(d, nodeId, { ...d.selectors.field.getValues(d, nodeId), [fieldId]: value as never })
                : null;

            d.reducers.field.setValue(d, nodeId, fieldId, value as never);
            d.reducers.node.validate(d, nodeId);

            return { nodeId, fieldId, issues: d.issues.nodes[nodeId] ?? null, derivation };
        }),
    },
};

