import { Foundations } from "../../../Foundations";
import { Validation } from "../../../Validation";
import { Workflow } from "../../../Workflow";
import { Port } from "../../../Foundations/Port";
import type { Document } from "../index";
import { cloneDeep } from 'lodash';
import { Algorithms } from "../../../Algorithms";

export const workflowReducers: WorkflowReducers = {
    open: (s, workflow, options = {}) => {
        const data = Workflow.Data.Schema.parse(workflow.data);

        s.workflowId = workflow.id;
        s.data = data;
        s.cache = Workflow.createCache(data, s.blueprints);

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
              : !s.cache.resolvedShape[source.nodeId]?.outputs.some(o => o.id === source.portId) ? `source port "${source.portId}" on "${source.nodeId}"`
              : !s.cache.resolvedShape[target.nodeId]?.inputs.some(i => i.id === target.portId) ? `target port "${target.portId}" on "${target.nodeId}"`
              : null;

            if (missing)
                console.warn(`[workflow.open] Pruning dangling edge ${edgeId}: missing ${missing}`);

            return !missing;
        });

        const prunedCount = data.edges.length - keptEdges.length;
        s.isDirty = Boolean(options.repaired) || prunedCount > 0;

        if (prunedCount > 0) {
            data.edges = keptEdges;
            s.cache = Workflow.createCache(data, s.blueprints);
        }
        s.cycles = [];
        s.stronglyConnectedComponents = [];
        s.issues = {
            nodes: {},
            cycles: []
        }
        s.dependencyUpdates = { published: {}, draft: {} }

        s.reducers.dependency.removeUnused(s);

        s.reducers.workflow.recomputeAllCycles(s);

        s.reducers.workflow.validate(s);
    },
    // Derive polymorphicResolutions from the existing edges — replays the same resolution the
    // edge reducer does on connect. No-op for already-resolved (v2) nodes; reconstructs it for
    // migrated (v1) nodes whose resolutions weren't persisted. Requires blueprints hydrated.
    reconstructPolymorphism: (s) => {
        for (const edge of Object.values(s.cache.edges)) {
            const sourcePort = s.selectors.node.getOutputs(s, edge.source.nodeId).find(o => o.id === edge.source.portId);
            const targetPort = s.selectors.node.getInputs(s, edge.target.nodeId).find(i => i.id === edge.target.portId);
            if (!sourcePort || !targetPort) continue;

            if (Port.isPolymorphic(targetPort) && !Port.isUnresolvedLike(sourcePort.variant))
                s.reducers
                  .node
                  .polymorphism
                  .resolveGroup(s, edge.target.nodeId, targetPort, sourcePort.variant);
            else if (Port.isPolymorphic(sourcePort) && !Port.isUnresolvedLike(targetPort.variant))
                s.reducers
                 .node
                 .polymorphism
                 .resolveGroup(s, edge.source.nodeId, sourcePort, targetPort.variant);
        }
    },
    close: (s) => {
        s.workflowId = '' as Workflow.Id;
        s.data = cloneDeep(Workflow.INITIAL.data);
        s.cache = Workflow.createCache(cloneDeep(Workflow.INITIAL.data), {});
        s.isDirty = false;
    },
    validate: (s) => {
        const issues = Validation.Issue.checkWorkflow(s.data, s.cycles, s.cache);
        s.issues = issues;
    },
    setFields: (s, fields) => {
        s.isDirty = true;
        s.data.fields = [...fields];
    },
    recomputeAllCycles: (s) => {
        console.log("RECOMPUTING ALL CYCLES")
        const arcsMap = Workflow.deriveArcs(s.cache);
        const sccs = Algorithms.Tarjan.deriveSCCs(s.data.nodes, arcsMap)[3]

        s.stronglyConnectedComponents = sccs;

        const cycles = Algorithms.Johnson.getAllCycles(arcsMap, sccs);
        s.cycles = cycles;

        s.issues.cycles = Validation.Issue.Cycle.checkAll(cycles, s.data);
        s.cyclesDirty = false;
    }
}

type WorkflowReducers = {
    open: (state: Document, workflow: Workflow, options?: { repaired?: boolean }) => void
    close: (state: Document) => void
    validate: (state: Document) => void
    setFields: (state: Document, fields: Foundations.Field[]) => void

    recomputeAllCycles: (s: Document) => void
    reconstructPolymorphism: (s: Document) => void
}
