import { Foundations, Validation, Workflow } from "@pretzel-graph/shared/domain";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import type { WorkbenchSDK } from "../sdk";
import { cloneDeep } from 'lodash';
import { Algorithms } from "@pretzel-graph/shared/domain/Algorithms";

export const workflowReducers = {
    open: (s, workflow) => {
        const data = Workflow.Data.Schema.parse(workflow.data);

        // Drop edges whose source/target node no longer exists (orphaned by a node
        // deletion that didn't clean up its edges). Left in place they'd dangle in the
        // persisted blob; pruning here removes them on the next commit.
        const keptEdges = data.edges.filter(edgeId => {
            const edge = Workflow.Edge.fromId(edgeId);
            const dangling = !data.nodes[edge.source.nodeId] || !data.nodes[edge.target.nodeId];
            if (dangling)
                console.warn(`[workflow.open] Pruning dangling edge ${edgeId}: missing ${!data.nodes[edge.source.nodeId] ? `source "${edge.source.nodeId}"` : `target "${edge.target.nodeId}"`}`);
            return !dangling;
        });
        const prunedCount = data.edges.length - keptEdges.length;
        data.edges = keptEdges;

        s.workflowId = workflow.id;
        s.data = data;
        s.isDirty = prunedCount > 0;
        s.cache = Workflow.createCache(data);
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
                s.reducers.node.polymorphism.resolveGroup(s, edge.target.nodeId, targetPort, sourcePort.variant);
            else if (Port.isPolymorphic(sourcePort) && !Port.isUnresolvedLike(targetPort.variant))
                s.reducers.node.polymorphism.resolveGroup(s, edge.source.nodeId, sourcePort, targetPort.variant);
        }
    },
    close: (s) => {
        s.workflowId = '' as Workflow.Id;
        s.data = cloneDeep(Workflow.INITIAL.data);
        s.cache = Workflow.createCache(cloneDeep(Workflow.INITIAL.data));
        s.isDirty = false;
    },
    validate: (s) => {
        const issues = Validation.Issue.checkWorkflow(s.data, s.cycles, s.cache, s.selectors.getBlueprints(s));
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
} satisfies WorkflowReducers

type WorkflowReducers = {
    open: (state: WorkbenchSDK.State, workflow: Workflow) => void
    close: (state: WorkbenchSDK.State) => void
    validate: (state: WorkbenchSDK.State) => void
    setFields: (state: WorkbenchSDK.State, fields: Foundations.Field[]) => void

    recomputeAllCycles: (s: WorkbenchSDK.State) => void
    reconstructPolymorphism: (s: WorkbenchSDK.State) => void
}
