import { VersionControl, Workflow } from "@pretzel-graph/shared/domain";
import { api } from "../ApiInterceptorSDK";
import { QuerySDK } from "../QuerySDK/sdk";
import { RealtimeSDK } from "../Realtime/sdk";
import type { VersionControlSDKImpl } from "./sdk";

export const createVersionControlSDKActions = (sdk: VersionControlSDKImpl) => {
    return {
        publish: async (workflowId, payload) => {
            const data = await VersionControl.API.publish(api, workflowId, payload);
            sdk.setState(s => {
                sdk.reducers.currentWorkflow.upsert(s, data.publication);
                sdk.reducers.activeWorkflows.upsert(s, data.publication);
            });
            QuerySDK.client.invalidateQueries({ queryKey: ["version-control", "publications", workflowId] });
            return data;
        },

        list: async (workflowId) => {
            const data = await VersionControl.API.list(api, workflowId);
            sdk.setState(s => { sdk.reducers.currentWorkflow.set(s, data.publications) });
            return data;
        },

        listActiveWorkflows: async () => {
            const data = await VersionControl.API.listActiveWorkflows(api);
            sdk.setState(s => { sdk.reducers.activeWorkflows.set(s, data.activeWorkflows) });
            return data;
        },

        getActiveByWorkflowId: async (workflowId) => {
            const data = await VersionControl.API.getActiveByWorkflow(api, workflowId);
            sdk.setState(s => {
                if (data.publication) sdk.reducers.activeWorkflows.upsert(s, data.publication);
                else sdk.reducers.activeWorkflows.removeByWorkflowId(s, workflowId);
            });
            return data;
        },

        get: async (publicationId) => {
            return VersionControl.API.get(api, publicationId);
        },

        activate: async (workflowId, publicationId) => {
            const data = await VersionControl.API.activate(api, workflowId, publicationId);
            sdk.setState(s => {
                sdk.reducers.currentWorkflow.deactivateAll(s);
                sdk.reducers.currentWorkflow.upsert(s, data.publication);
                sdk.reducers.activeWorkflows.upsert(s, data.publication);
            });
            QuerySDK.client.invalidateQueries({ queryKey: ["version-control", "publications"] });
            return data;
        },

        deactivate: async (workflowId, publicationId) => {
            const data = await VersionControl.API.deactivate(api, workflowId, publicationId);
            sdk.setState(s => {
                sdk.reducers.currentWorkflow.upsert(s, data.publication);
                sdk.reducers.activeWorkflows.removeByWorkflowId(s, data.publication.workflow_id);
            });
            QuerySDK.client.invalidateQueries({ queryKey: ["version-control", "publications"] });
            return data;
        },

        remove: async (workflowId, publicationId) => {
            const data = await VersionControl.API.remove(api, workflowId, publicationId);
            sdk.setState(s => {
                sdk.reducers.currentWorkflow.remove(s, publicationId);
                sdk.reducers.activeWorkflows.removeByWorkflowId(s, data.workflowId);
            });
            QuerySDK.client.invalidateQueries({ queryKey: ["version-control", "publications"] });
            return data;
        },

        subscribe: (workflowId) => {
            sdk.actions.unsubscribe();
            sdk.setState(s => { sdk.reducers.subscription.setWorkflow(s, workflowId) });

            for (const action of VersionControl.Signal.Action.options) {
                const channel = VersionControl.Signal.getChannel(workflowId, action);
                const unsub = RealtimeSDK.subscribeToChannel<VersionControl.Signal>(channel, (signal) => {
                    switch (signal.type) {
                        case "published":
                        case "activated":
                            sdk.setState(s => {
                                sdk.reducers.currentWorkflow.upsert(s, signal.publication);
                                sdk.reducers.activeWorkflows.upsert(s, signal.publication);
                            });
                            break;
                        case "deactivated":
                            sdk.setState(s => {
                                const pub = s.currentWorkflowPublications.find(p => p.id === signal.publicationId);
                                if (pub) pub.is_active = false;
                                sdk.reducers.activeWorkflows.removeByWorkflowId(s, signal.workflowId);
                            });
                            break;
                        case "removed":
                            sdk.setState(s => {
                                sdk.reducers.currentWorkflow.remove(s, signal.publicationId);
                                sdk.reducers.activeWorkflows.removeByWorkflowId(s, signal.workflowId);
                            });
                            break;
                    }
                });
                sdk.unsubscribers.push(unsub);
            }
        },

        unsubscribe: () => {
            for (const unsub of sdk.unsubscribers) unsub();
            sdk.unsubscribers = [];
            sdk.setState(s => { sdk.reducers.subscription.setWorkflow(s, null) });
        },

        activeWorkflows: {
            removeByWorkflowId: (workflowId) => {
                sdk.setState(s => { sdk.reducers.activeWorkflows.removeByWorkflowId(s, workflowId) });
            },
            removeByPublicationId: (publicationId) => {
                sdk.setState(s => { sdk.reducers.activeWorkflows.removeByPublicationId(s, publicationId) });
            },
        },
    } satisfies VersionControlSDKActions;
};

export type VersionControlSDKActions = {
    publish: (workflowId: Workflow.Id, payload: VersionControl.API.Publish.Request) => Promise<VersionControl.API.Publish.Response>
    list: (workflowId: Workflow.Id) => Promise<VersionControl.API.List.Response>
    listActiveWorkflows: () => Promise<VersionControl.API.ListActiveWorkflows.Response>
    getActiveByWorkflowId: (workflowId: Workflow.Id) => Promise<VersionControl.API.GetActiveByWorkflow.Response>
    get: (publicationId: VersionControl.Publication.Id) => Promise<VersionControl.API.Get.Response>
    activate: (workflowId: Workflow.Id, publicationId: VersionControl.Publication.Id) => Promise<VersionControl.API.Activate.Response>
    deactivate: (workflowId: Workflow.Id, publicationId: VersionControl.Publication.Id) => Promise<VersionControl.API.Deactivate.Response>
    remove: (workflowId: Workflow.Id, publicationId: VersionControl.Publication.Id) => Promise<VersionControl.API.Remove.Response>
    subscribe: (workflowId: Workflow.Id) => void
    unsubscribe: () => void
    activeWorkflows: {
        removeByWorkflowId: (workflowId: Workflow.Id) => void
        removeByPublicationId: (publicationId: VersionControl.Publication.Id) => void
    }
};
