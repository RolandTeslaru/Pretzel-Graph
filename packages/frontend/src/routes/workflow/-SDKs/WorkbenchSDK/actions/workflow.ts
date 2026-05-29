import type { DropFirstArg } from "@/SDKs/types";
import type { WorkbenchSDKImpl, WorkbenchSDK } from "../sdk"
import { withCommit } from "../utils/actions"
import { Workbench, Workflow } from "@pretzel-graph/shared/domain";
import { api } from "@/SDKs/ApiInterceptorSDK";
import { LibrarySDK } from "@/SDKs/LibrarySDK/sdk";

export function createWorkflowActions(sdk: WorkbenchSDKImpl) {
    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;

    return {
        close:    (...props) => setState(s => { reducers.workflow.close(s,    ...props) }),
        open:     (...props) => setState(s => { reducers.workflow.open(s,     ...props) }),
        validate: (...props) => setState(s => { reducers.workflow.validate(s, ...props) }),
        setFields: withCommit((...props) => setState(s => { reducers.workflow.setFields(s, ...props) })),
        load: async (workflowId, abortSignal) => {
            try {
                const { workflow } = await Workbench.API.Workflow.get(api, { workflowId }, abortSignal)
                if (!workflow)
                    throw new Error("Workflow not found")

                Workflow.Schema.parse(workflow);
                const { data: _data, ...meta } = workflow;
                
                // Also update the library metadata cache
                LibrarySDK.actions.workflow.upsertMeta(meta);

                setState(s => {
                    reducers.workflow.open(s, workflow)
                })

                // Fire and forget
                sdk.actions.dependency.checkUpdates()
            } catch (error) {
                console.error("Failed to load workflow", error);
                throw error;
            }
        }
    } satisfies WorkflowActions;
}

export type WorkflowActions = {
    close:    DropFirstArg<WorkbenchSDK.Reducers['workflow']['close']>;
    open:     DropFirstArg<WorkbenchSDK.Reducers['workflow']['open']>;
    validate: DropFirstArg<WorkbenchSDK.Reducers['workflow']['validate']>;
    setFields: DropFirstArg<WorkbenchSDK.Reducers['workflow']['setFields']>;
    load: (workflowId: Workflow.Id, abortSignal: AbortSignal) => Promise<void>;
};
