import { WorkbenchSDK } from '../sdk';
import { debounce } from '../../../decorators/debounce';
import { toast } from 'sonner';
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain';
import { supabase } from '@/libs/supabase';

export const commitImmediately = async () => {
    if (WorkbenchSDK.state.isDirty === false) return;
    try {
        console.log("Committing")
        await Workflow.API.commit(supabase, { workflow: WorkbenchSDK.state.workflow })
    } catch (error) {
        toast.error("Could not save to cloud")
    }
    WorkbenchSDK.actions.setDirty(false);
};

export const commit: () => void = debounce(async () => {
    commitImmediately();
}, 1000);

export const withCommit = <TArgs extends any[]>(fn: (...args: TArgs) => void, message?: string): ((...args: TArgs) => void) => {
    return (...args) => {
        try {
            fn(...args);
            commit();
        } catch (error) {
            console.error(error);
            toast.error(message ?? `${error instanceof Error ? error.message : String(error)}`);
        }
    };
};

export const withAsyncCommit = <TArgs extends any[]>(fn: (...args: TArgs) => Promise<void>, message?: string): ((...args: TArgs) => Promise<void>) => {
    return async (...args) => {
        try {
            await fn(...args);
            commit();
        } catch (error) {
            console.error(error);
            toast.error(message ?? `${error instanceof Error ? error.message : String(error)}`);
        }
    };
};

export const debouncedValidateField = debounce((nodeId: Workflow.Node.Id, field: Foundations.Field) => {
    WorkbenchSDK.useStore.setState(s => { WorkbenchSDK.reducers.field.validate(s, nodeId, field) });
}, 300);

export const debouncedValidateInput = debounce((nodeId: Workflow.Node.Id, input: Foundations.Port.Input) => {
    WorkbenchSDK.useStore.setState(s => { WorkbenchSDK.reducers.input.validate(s, nodeId, input) });
}, 300);
