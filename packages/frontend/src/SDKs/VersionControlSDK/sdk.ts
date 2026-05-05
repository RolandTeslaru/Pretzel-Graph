import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { BaseSDK } from "../Base";
import { SDK } from "../SDKManager";
import { VersionControl, Workflow } from "@pretzel-graph/shared/domain";
import { api } from "../ApiInterceptorSDK";
import { RealtimeSDK } from "../Realtime/sdk";
import { QuerySDK } from "../QuerySDK/sdk";

@SDK("VersionControl")
export class VersionControlSDKImpl extends BaseSDK<VersionControlSDK.State> {
    constructor() { super() }

    public readonly useStore: BaseSDK.Store<VersionControlSDK.State> = create(
        immer<VersionControlSDK.State>(() => ({
            currentWorkflowPublications: [],
            activeWorkflows: {},
            subscribedWorkflowId: null,
        }))
    )

    private unsubscribers: Array<() => void> = [];

    public readonly reducers: VersionControlSDK.Reducers = {
        currentWorkflow: {
            set: (s, publications) => {
                s.currentWorkflowPublications = publications;
            },
            upsert: (s, publication) => {
                const idx = s.currentWorkflowPublications.findIndex(p => p.id === publication.id);
                if (idx >= 0) {
                    s.currentWorkflowPublications[idx] = publication;
                } else {
                    s.currentWorkflowPublications.unshift(publication);
                }
                s.currentWorkflowPublications.sort((a, b) => b.version - a.version);
            },
            deactivateAll: (s) => {
                for (const publication of s.currentWorkflowPublications) {
                    publication.is_active = false;
                }
            },
            remove: (s, publicationId) => {
                s.currentWorkflowPublications = s.currentWorkflowPublications.filter(p => p.id !== publicationId);
            },
        },
        activeWorkflows: {
            set: (s, activeWorkflows) => {
                s.activeWorkflows = activeWorkflows;
            },
            upsert: (s, publication) => {
                if (publication.is_active) {
                    s.activeWorkflows[publication.workflow_id] = publication;
                } else if (s.activeWorkflows[publication.workflow_id]?.id === publication.id) {
                    delete s.activeWorkflows[publication.workflow_id];
                }
            },
            removeByWorkflowId: (s, workflowId) => {
                delete s.activeWorkflows[workflowId];
            },
            removeByPublicationId: (s, publicationId) => {
                for (const workflowId in s.activeWorkflows) {
                    const publication = s.activeWorkflows[workflowId as Workflow.Id];
                    if (publication?.id === publicationId) {
                        delete s.activeWorkflows[workflowId as Workflow.Id];
                        return;
                    }
                }
            },
        },
        subscription: {
            setWorkflow: (s, workflowId) => {
                s.subscribedWorkflowId = workflowId;
            },
        },
    }

    public readonly actions: VersionControlSDK.Actions = {
        publish: async (payload) => {
            const data = await VersionControl.API.publish(api, payload);
            this.setState(s => {
                this.reducers.currentWorkflow.upsert(s, data.publication);
                this.reducers.activeWorkflows.upsert(s, data.publication);
            });
            QuerySDK.client.invalidateQueries({ queryKey: ["version-control", "publications", payload.workflowId] });
            return data;
        },

        list: async (workflowId) => {
            const data = await VersionControl.API.list(api, { workflowId });
            this.setState(s => { this.reducers.currentWorkflow.set(s, data.publications) });
            return data;
        },

        listActiveWorkflows: async () => {
            const data = await VersionControl.API.listActiveWorkflows(api);
            this.setState(s => { this.reducers.activeWorkflows.set(s, data.activeWorkflows) });
            return data;
        },

        get: async (publicationId) => {
            return VersionControl.API.get(api, { publicationId });
        },

        activate: async (publicationId) => {
            const data = await VersionControl.API.activate(api, { publicationId });
            this.setState(s => {
                this.reducers.currentWorkflow.deactivateAll(s);
                this.reducers.currentWorkflow.upsert(s, data.publication);
                this.reducers.activeWorkflows.upsert(s, data.publication);
            });
            QuerySDK.client.invalidateQueries({ queryKey: ["version-control", "publications"] });
            return data;
        },

        deactivate: async (publicationId) => {
            const data = await VersionControl.API.deactivate(api, { publicationId });
            this.setState(s => {
                this.reducers.currentWorkflow.upsert(s, data.publication);
                this.reducers.activeWorkflows.removeByWorkflowId(s, data.publication.workflow_id);
            });
            QuerySDK.client.invalidateQueries({ queryKey: ["version-control", "publications"] });
            return data;
        },

        remove: async (publicationId) => {
            const data = await VersionControl.API.remove(api, { publicationId });
            this.setState(s => {
                this.reducers.currentWorkflow.remove(s, publicationId);
                this.reducers.activeWorkflows.removeByWorkflowId(s, data.workflowId);
            });
            QuerySDK.client.invalidateQueries({ queryKey: ["version-control", "publications"] });
            return data;
        },

        subscribe: (workflowId) => {
            this.actions.unsubscribe();
            this.setState(s => { this.reducers.subscription.setWorkflow(s, workflowId) });

            for (const action of VersionControl.Signal.Action.options) {
                const channel = VersionControl.Signal.getChannel(workflowId, action);
                const unsub = RealtimeSDK.subscribeToChannel<VersionControl.Signal>(channel, (signal) => {
                    switch (signal.type) {
                        case "published":
                        case "activated":
                            this.setState(s => {
                                this.reducers.currentWorkflow.upsert(s, signal.publication);
                                this.reducers.activeWorkflows.upsert(s, signal.publication);
                            });
                            break;
                        case "deactivated":
                            this.setState(s => {
                                const pub = s.currentWorkflowPublications.find(p => p.id === signal.publicationId);
                                if (pub) pub.is_active = false;
                                this.reducers.activeWorkflows.removeByWorkflowId(s, signal.workflowId);
                            });
                            break;
                        case "removed":
                            this.setState(s => {
                                this.reducers.currentWorkflow.remove(s, signal.publicationId);
                                this.reducers.activeWorkflows.removeByWorkflowId(s, signal.workflowId);
                            });
                            break;
                    }
                });
                this.unsubscribers.push(unsub);
            }
        },

        unsubscribe: () => {
            for (const unsub of this.unsubscribers) unsub();
            this.unsubscribers = [];
            this.setState(s => { this.reducers.subscription.setWorkflow(s, null) });
        },

        activeWorkflows: {
            removeByWorkflowId: (workflowId) => {
                this.setState(s => { this.reducers.activeWorkflows.removeByWorkflowId(s, workflowId) });
            },
            removeByPublicationId: (publicationId) => {
                this.setState(s => { this.reducers.activeWorkflows.removeByPublicationId(s, publicationId) });
            },
        },
    }

    public readonly selectors: VersionControlSDK.Selectors = {
        getActive: (state) => {
            return state.currentWorkflowPublications.find(p => p.is_active) ?? null;
        },
    }
}

export const VersionControlSDK = SDK.get<VersionControlSDKImpl>("VersionControl")

export namespace VersionControlSDK {
    export type State = {
        currentWorkflowPublications: VersionControl.PublicationMeta[]
        activeWorkflows: Record<Workflow.Id, VersionControl.PublicationMeta>
        subscribedWorkflowId: Workflow.Id | null
    }

    export type Reducers = {
        currentWorkflow: {
            set: (
                state: VersionControlSDK.State,
                publications: VersionControl.PublicationMeta[],
            ) => void
            upsert: (
                state: VersionControlSDK.State,
                publication: VersionControl.PublicationMeta,
            ) => void
            deactivateAll: (state: VersionControlSDK.State) => void
            remove: (
                state: VersionControlSDK.State,
                publicationId: VersionControl.Publication.Id,
            ) => void
        }
        activeWorkflows: {
            set: (
                state: VersionControlSDK.State,
                activeWorkflows: Record<Workflow.Id, VersionControl.PublicationMeta>,
            ) => void
            upsert: (
                state: VersionControlSDK.State,
                publication: VersionControl.PublicationMeta,
            ) => void
            removeByWorkflowId: (
                state: VersionControlSDK.State,
                workflowId: Workflow.Id,
            ) => void
            removeByPublicationId: (
                state: VersionControlSDK.State,
                publicationId: VersionControl.Publication.Id,
            ) => void
        }
        subscription: {
            setWorkflow: (
                state: VersionControlSDK.State,
                workflowId: Workflow.Id | null,
            ) => void
        }
    }

    export type Actions = {
        publish: (payload: VersionControl.API.Publish.Request) => Promise<VersionControl.API.Publish.Response>
        list: (workflowId: Workflow.Id) => Promise<VersionControl.API.List.Response>
        listActiveWorkflows: () => Promise<VersionControl.API.ListActiveWorkflows.Response>
        get: (publicationId: VersionControl.Publication.Id) => Promise<VersionControl.API.Get.Response>
        activate: (publicationId: VersionControl.Publication.Id) => Promise<VersionControl.API.Activate.Response>
        deactivate: (publicationId: VersionControl.Publication.Id) => Promise<VersionControl.API.Deactivate.Response>
        remove: (publicationId: VersionControl.Publication.Id) => Promise<VersionControl.API.Remove.Response>
        subscribe: (workflowId: Workflow.Id) => void
        unsubscribe: () => void
        activeWorkflows: {
            removeByWorkflowId: (workflowId: Workflow.Id) => void
            removeByPublicationId: (publicationId: VersionControl.Publication.Id) => void
        }
    }

    export type Selectors = {
        getActive: (state: VersionControlSDK.State) => VersionControl.PublicationMeta | null
    }
}
