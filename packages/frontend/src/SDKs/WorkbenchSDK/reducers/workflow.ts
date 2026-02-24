import { Validation, Workflow } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { cloneDeep } from 'lodash';

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
        workflowReducers.validate(s);
    },
    close: (s) => {
        s.workflow = cloneDeep(Workflow.INITIAL);
        s.cache = Workflow.createCache(cloneDeep(Workflow.INITIAL));
    },
    validate: (s) => {
        const issues = Validation.Issue.checkWorkflow(s.workflow, s.cache);
        s.issues = issues;
    } 
} satisfies WorkflowReducers

type WorkflowReducers = {
    setLock: (state: WorkbenchSDK.State, lock: boolean) => void
    open: (state: WorkbenchSDK.State, workflow: Workflow) => void
    close: (state: WorkbenchSDK.State) => void
    validate: (state: WorkbenchSDK.State) => void
}
