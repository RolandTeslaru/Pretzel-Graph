import { Workflow } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { cacheReducers } from "./cache";
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
        s.cache = cacheReducers.createAll(s, workflow);
    },
    close: (s) => {
        s.workflow = cloneDeep(Workflow.INITIAL);
        s.cache = cacheReducers.createAll(s, cloneDeep(Workflow.INITIAL));
    }
} satisfies WorkflowReducers

type WorkflowReducers = {
    setLock: (state: WorkbenchSDK.State, lock: boolean) => void
    open: (state: WorkbenchSDK.State, workflow: Workflow) => void
    close: (state: WorkbenchSDK.State) => void
}
