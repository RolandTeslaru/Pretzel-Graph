import { WorkbenchSDK } from '../sdk';
import { debounce } from '@/decorators/debounce';
import { toast } from 'sonner';
import { Foundations, Workbench, Workflow } from '@pretzel-graph/shared/domain';
import { api } from '@/SDKs/ApiInterceptorSDK';
import { workflowReducers } from '../reducers/workflow';

export const commit = async () => {
    if (WorkbenchSDK.state.isDirty === false) return;
    try {
        console.log("Committing")
        await Workbench.API.Workflow.commit(api, { workflowId: WorkbenchSDK.state.workflowId, data: WorkbenchSDK.state.data })
        WorkbenchSDK.actions.setDirty(false);
    } catch (error) {
        toast.error("Could not save to cloud")
    }
};

export const debouncedCommit: () => void = debounce(async () => {
    commit();
}, 1000);

export const withCommit = <TArgs extends any[]>(fn: (...args: TArgs) => void, message?: string): ((...args: TArgs) => void) => {
    return (...args) => {
        try {
            const val = fn(...args);
            debouncedCommit();
            return val;
        } catch (error) {
            console.error(error);
            toast.error(message ?? `${error instanceof Error ? error.message : String(error)}`);
        }
    };
};

export const withCyclesRecompute = (fn: (s: WorkbenchSDK.State) => void): ((s: WorkbenchSDK.State) => void) => {
    return (s: WorkbenchSDK.State) => {
        fn(s);
        if(s.cyclesDirty){
            workflowReducers.recomputeAllCycles(s);
            s.cyclesDirty = false
        }
    }
}

export const withAsyncCommit = <TArgs extends any[], TReturn>(fn: (...args: TArgs) => Promise<TReturn>, message?: string): ((...args: TArgs) => Promise<TReturn>) => {
    return async (...args) => {
        try {
            const val = await fn(...args);
            debouncedCommit();
            return val; 
        } catch (error) {
            console.error(error);
            toast.error(message ?? `${error instanceof Error ? error.message : String(error)}`);
            return void 0 as TReturn; // Return undefined on error, but cast to TReturn to satisfy the return type
        }
    };
};

export const validateField = (nodeId: Workflow.Node.Id, field: Foundations.Field) => {
    WorkbenchSDK.useStore.setState(s => { WorkbenchSDK.reducers.field.validate(s, nodeId, field) });
};

export const debouncedValidateField = debounce((nodeId: Workflow.Node.Id, field: Foundations.Field) => {
    validateField(nodeId, field);
}, 300);

export const validateInput = (nodeId: Workflow.Node.Id, input: Foundations.Port.Input) => {
    WorkbenchSDK.useStore.setState(s => { WorkbenchSDK.reducers.input.validate(s, nodeId, input) });
};

export const debouncedValidateInput = debounce((nodeId: Workflow.Node.Id, input: Foundations.Port.Input) => {
    validateInput(nodeId, input);
}, 300);
