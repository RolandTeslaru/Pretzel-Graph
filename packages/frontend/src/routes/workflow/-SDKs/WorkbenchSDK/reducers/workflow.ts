import { Foundations, Validation, Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { cloneDeep } from 'lodash';
import { Algorithms } from "@pretzel-graph/shared/domain/Algorithms";
import { dependencyReducers } from "./dependency";

export const workflowReducers = {
    open: (s, workflow) => {
        const data = Workflow.Data.Schema.parse(workflow.data);

        s.workflowId = workflow.id;
        s.data = data;
        s.cache = Workflow.createCache(data);
        s.cycles = [];
        s.stronglyConnectedComponents = [];
        s.issues = {
            nodes: {},
            cycles: []
        }
        s.dependencyUpdates = { published: {}, draft: {} }

        dependencyReducers.removeUnused(s);

        workflowReducers.recomputeAllCycles(s);

        workflowReducers.validate(s);
    },
    close: (s) => {
        s.workflowId = '' as Workflow.Id;
        s.data = cloneDeep(Workflow.INITIAL.data);
        s.cache = Workflow.createCache(cloneDeep(Workflow.INITIAL.data));
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
} satisfies WorkflowReducers

type WorkflowReducers = {
    open:     (state: WorkbenchSDK.State, workflow: Workflow) => void
    close:    (state: WorkbenchSDK.State) => void
    validate: (state: WorkbenchSDK.State) => void
    setFields: (state: WorkbenchSDK.State, fields: Foundations.Field[]) => void

    recomputeAllCycles: (s: WorkbenchSDK.State) => void
}
