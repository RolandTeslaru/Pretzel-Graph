import { Validation, Workflow } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { cloneDeep } from 'lodash';
import { Algorithms } from "@vx-agent-editor/shared/domain/Algorithms";

export const workflowReducers = {
    setLock: (s, lock) => {
        if (s.workflow.locked === lock)
            return
        s.isDirty = true;
        s.workflow.locked = lock;
    },
    open: (s, workflow) => {
        s.workflow = workflow;
        s.cache = Workflow.createCache(workflow);
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
        s.workflow = cloneDeep(Workflow.INITIAL);
        s.cache = Workflow.createCache(cloneDeep(Workflow.INITIAL));
    },
    validate: (s) => {
        const issues = Validation.Issue.checkWorkflow(s.workflow, s.cycles, s.cache);
        s.issues = issues;
    },
    recomputeAllCycles: (s) => {
        console.log("RECOMPUTING ALL CYCLES")
        const arcsMap = Workflow.deriveArcs(s.cache);
        const sccs = Algorithms.Tarjan.deriveSCCs(s.workflow.data.nodes, arcsMap)[3]

        s.stronglyConnectedComponents = sccs;

        const cycles = Algorithms.Johnson.getAllCycles(arcsMap, sccs);
        s.cycles = cycles;  

        s.issues.cycles = Validation.Issue.Cycle.checkAll(cycles, s.workflow);
        s.cyclesDirty = false;
    }
} satisfies WorkflowReducers

type WorkflowReducers = {
    setLock:  (state: WorkbenchSDK.State, lock: boolean) => void
    open:     (state: WorkbenchSDK.State, workflow: Workflow) => void
    close:    (state: WorkbenchSDK.State) => void
    validate: (state: WorkbenchSDK.State) => void

    recomputeAllCycles: (s: WorkbenchSDK.State) => void
}
