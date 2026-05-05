import { Validation, Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { cloneDeep } from 'lodash';
import { Algorithms } from "@pretzel-graph/shared/domain/Algorithms";

export const workflowReducers = {
    open: (s, workflow) => {
        s.workflowId = workflow.id;
        s.data = workflow.data;
        s.cache = Workflow.createCache(workflow.data);
        s.cycles = [];
        s.stronglyConnectedComponents = [];
        s.issues = {
            nodes: {},
            cycles: []
        }

        workflowReducers.recomputeAllCycles(s);

        workflowReducers.validate(s);
    },
    close: (s) => {
        s.workflowId = '' as Workflow.Id;
        s.data = cloneDeep(Workflow.INITIAL.data);
        s.cache = Workflow.createCache(cloneDeep(Workflow.INITIAL.data));
    },
    validate: (s) => {
        const issues = Validation.Issue.checkWorkflow(s.data, s.cycles, s.cache);
        s.issues = issues;
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
    open:     (state: WorkbenchSDK.State, workflow: Workflow) => void
    close:    (state: WorkbenchSDK.State) => void
    validate: (state: WorkbenchSDK.State) => void

    recomputeAllCycles: (s: WorkbenchSDK.State) => void
}
