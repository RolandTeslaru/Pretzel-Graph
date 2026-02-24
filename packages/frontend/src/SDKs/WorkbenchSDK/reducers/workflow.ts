import { Workflow } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { cacheReducers } from "./cache";
import { cloneDeep } from 'lodash';
import { nodeReducers } from "./node";

export const workflowReducers = {
    setLock: (s, lock) => {
        if (s.workflow.locked === lock)
            return
        s.isDirty = true;
        s.workflow.locked = lock;
    },
    open: (s, workflow) => {
        s.workflow = workflow;
        s.cache = cacheReducers.createAll(s, workflow);
        workflowReducers.validate(s);
    },
    close: (s) => {
        s.workflow = cloneDeep(Workflow.INITIAL);
        s.cache = cacheReducers.createAll(s, cloneDeep(Workflow.INITIAL));
    },
    validate: (s) => {
        const workflow = s.workflow;

        Object.values(workflow.data.nodes).forEach(node => {
            nodeReducers.validate(s, node.id);
        })
    } 
} satisfies WorkflowReducers

type WorkflowReducers = {
    setLock: (state: WorkbenchSDK.State, lock: boolean) => void
    open: (state: WorkbenchSDK.State, workflow: Workflow) => void
    close: (state: WorkbenchSDK.State) => void
    validate: (state: WorkbenchSDK.State) => void
}
