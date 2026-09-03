import { Foundations } from "../../../Foundations";
import { Validation } from "../../../Validation";
import { Workflow } from "../../../Workflow";
import { Port } from "../../../Foundations/Port";
import type { Document } from "../index";
import { cloneDeep } from 'lodash';
import { Algorithms } from "../../../Algorithms";

export const workflowReducers: WorkflowReducers = {
    open: (d, workflow, options = {}) => {
        const data = Workflow.Data.Schema.parse(workflow.data);

        d.workflowId = workflow.id;
        d.data = data;
        d.cache = Workflow.createCache(data, d.blueprints);

        // Drop edges whose endpoint no longer exists — either the node itself (orphaned by a
        // deletion that didn't clean up its edges) or the port (blueprint changed shape).
        // Left in place they'd dangle in the persisted blob; pruning here removes them on the
        // next commit. Needs the cache for resolved port shapes, so it runs after it's built.
        const keptEdges = data.edges.filter(edgeId => {
            const edge = Workflow.Edge.fromId(edgeId);
            const { source, target } = edge;

            const missing =
                !data.nodes[source.nodeId] ? `source node "${source.nodeId}"`
              : !data.nodes[target.nodeId] ? `target node "${target.nodeId}"`
              : !d.cache.resolvedShape[source.nodeId]?.outputs.some(o => o.id === source.portId) ? `source port "${source.portId}" on "${source.nodeId}"`
              : !d.cache.resolvedShape[target.nodeId]?.inputs.some(i => i.id === target.portId) ? `target port "${target.portId}" on "${target.nodeId}"`
              : null;

            if (missing)
                console.warn(`[workflow.open] Pruning dangling edge ${edgeId}: missing ${missing}`);

            return !missing;
        });

        const prunedCount = data.edges.length - keptEdges.length;
        d.isDirty = Boolean(options.repaired) || prunedCount > 0;

        if (prunedCount > 0) {
            data.edges = keptEdges;
            d.cache = Workflow.createCache(data, d.blueprints);
        }
        d.cycles = [];
        d.stronglyConnectedComponents = [];
        d.issues = {
            nodes: {},
            cycles: []
        }
        d.dependencyUpdates = { published: {}, draft: {} }

        d.reducers.dependency.removeUnused(d);

        d.reducers.workflow.recomputeAllCycles(d);

        d.reducers.workflow.validate(d);
    },
    // Derive polymorphicResolutions from the existing edges — replays the same resolution the
    // edge reducer does on connect. No-op for already-resolved (v2) nodes; reconstructs it for
    // migrated (v1) nodes whose resolutions weren't persisted. Requires blueprints hydrated.
    reconstructPolymorphism: (d) => {
        for (const edge of Object.values(d.cache.edges)) {
            const sourcePort = d.selectors.node.getOutputs(d, edge.source.nodeId).find(o => o.id === edge.source.portId);
            const targetPort = d.selectors.node.getInputs(d, edge.target.nodeId).find(i => i.id === edge.target.portId);
            if (!sourcePort || !targetPort) continue;

            if (Port.isPolymorphic(targetPort) && !Port.isUnresolvedLike(sourcePort.variant))
                d.reducers
                  .node
                  .polymorphism
                  .resolveGroup(d, edge.target.nodeId, targetPort, sourcePort.variant);
            else if (Port.isPolymorphic(sourcePort) && !Port.isUnresolvedLike(targetPort.variant))
                d.reducers
                 .node
                 .polymorphism
                 .resolveGroup(d, edge.source.nodeId, sourcePort, targetPort.variant);
        }
    },
    close: (d) => {
        d.workflowId = '' as Workflow.Id;
        d.data = cloneDeep(Workflow.INITIAL.data);
        d.cache = Workflow.createCache(cloneDeep(Workflow.INITIAL.data), {});
        d.isDirty = false;
    },
    validate: (d) => {
        const issues = Validation.Issue.checkWorkflow(d.data, d.cycles, d.cache);
        d.issues = issues;
    },
    setFields: (d, fields) => {
        d.isDirty = true;
        d.data.fields = [...fields];
    },
    recomputeAllCycles: (d) => {
        const arcsMap = Workflow.deriveArcs(d.cache);
        const sccs = Algorithms.Tarjan.deriveSCCs(d.data.nodes, arcsMap)[3]

        d.stronglyConnectedComponents = sccs;

        const cycles = Algorithms.Johnson.getAllCycles(arcsMap, sccs);
        d.cycles = cycles;

        d.issues.cycles = Validation.Issue.Cycle.checkAll(cycles, d.data);
        d.cyclesDirty = false;
    }
}

type WorkflowReducers = {
    open: (document: Document, workflow: Workflow, options?: { repaired?: boolean }) => void
    close: (document: Document) => void
    validate: (document: Document) => void
    setFields: (document: Document, fields: Foundations.Field[]) => void

    recomputeAllCycles: (document: Document) => void
    reconstructPolymorphism: (document: Document) => void
}
