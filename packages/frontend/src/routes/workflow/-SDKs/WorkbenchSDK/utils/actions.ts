import { WorkbenchSDK } from '../sdk';
import { debounce } from '@/decorators/debounce';
import { toast } from 'sonner';
import { Foundations, Workbench, Workflow } from '@pretzel-graph/shared/domain';
import { api } from '@/SDKs/ApiInterceptorSDK';
import { Document } from '@pretzel-graph/shared/domain/Workbench/Document';

const workflowReducers = Document.reducers.workflow;

export const commit = async () => {
    const { workflowId, data, isDirty } = WorkbenchSDK.state;
    if (isDirty === false || !workflowId) return;

    try {
        console.log("Committing")
        await Workbench.API.Workflow.commit(api, { workflowId, data })

        if (WorkbenchSDK.state.workflowId === workflowId) {
            WorkbenchSDK.actions.setDirty(false);
        }
    } catch (error) {
        toast.error("Could not save to cloud")
    }
};

export const debouncedCommit: () => void = debounce(async () => {
    commit();
}, 3000);

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

export const createToastPromise = <T>(promise: Promise<T>, options: Parameters<typeof toast.promise>[1]): Promise<T> => {
    toast.promise(promise, options)
    return promise
}

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
