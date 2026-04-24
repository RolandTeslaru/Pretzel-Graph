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
            publications: [],
            subscribedWorkflowId: null,
        }))
    )

    private unsubscribers: Array<() => void> = [];

    public readonly reducers: VersionControlSDK.Reducers = {
        upsertPublication: (pub) => {
            this.useStore.setState(s => {
                const idx = s.publications.findIndex(p => p.id === pub.id);
                if (idx >= 0) {
                    s.publications[idx] = pub;
                } else {
                    s.publications.unshift(pub);
                    s.publications.sort((a, b) => b.version - a.version);
                }
            });
        },
        removePublication: (id) => {
            this.useStore.setState(s => {
                s.publications = s.publications.filter(p => p.id !== id);
            });
        },
    }

    public readonly actions: VersionControlSDK.Actions = {
        publish: async (payload) => {
            const data = await VersionControl.API.publish(api, payload);
            this.reducers.upsertPublication(data.publication);
            QuerySDK.client.invalidateQueries({ queryKey: ["version-control", "publications", payload.workflowId] });
            return data;
        },

        list: async (workflowId) => {
            const data = await VersionControl.API.list(api, { workflowId });
            this.useStore.setState(s => {
                s.publications = data.publications;
            });
            return data;
        },

        get: async (publicationId) => {
            return VersionControl.API.get(api, { publicationId });
        },

        activate: async (publicationId) => {
            const data = await VersionControl.API.activate(api, { publicationId });
            this.useStore.setState(s => {
                for (const pub of s.publications) 
                    pub.is_active = false;
                
                const idx = s.publications.findIndex(p => p.id === data.publication.id);
                
                if (idx >= 0) 
                    s.publications[idx] = data.publication;
            });
            QuerySDK.client.invalidateQueries({ queryKey: ["version-control", "publications"] });
            return data;
        },

        deactivate: async (publicationId) => {
            const data = await VersionControl.API.deactivate(api, { publicationId });
            this.reducers.upsertPublication(data.publication);
            QuerySDK.client.invalidateQueries({ queryKey: ["version-control", "publications"] });
            return data;
        },

        remove: async (publicationId) => {
            const data = await VersionControl.API.remove(api, { publicationId });
            this.reducers.removePublication(publicationId);
            QuerySDK.client.invalidateQueries({ queryKey: ["version-control", "publications"] });
            return data;
        },

        subscribe: (workflowId) => {
            this.actions.unsubscribe();
            this.useStore.setState(s => { s.subscribedWorkflowId = workflowId });

            for (const action of VersionControl.Signal.Action.options) {
                const channel = VersionControl.Signal.getChannel(workflowId, action);
                const unsub = RealtimeSDK.subscribeToChannel<VersionControl.Signal>(channel, (signal) => {
                    switch (signal.type) {
                        case "published":
                        case "activated":
                            this.reducers.upsertPublication(signal.publication);
                            break;
                        case "deactivated":
                            this.useStore.setState(s => {
                                const pub = s.publications.find(p => p.id === signal.publicationId);
                                if (pub) pub.is_active = false;
                            });
                            break;
                        case "removed":
                            this.reducers.removePublication(signal.publicationId);
                            break;
                    }
                });
                this.unsubscribers.push(unsub);
            }
        },

        unsubscribe: () => {
            for (const unsub of this.unsubscribers) unsub();
            this.unsubscribers = [];
            this.useStore.setState(s => { s.subscribedWorkflowId = null });
        },
    }

    public readonly selectors: VersionControlSDK.Selectors = {
        activePublication: () => {
            return this.useStore.getState().publications.find(p => p.is_active) ?? null;
        },
    }
}

export const VersionControlSDK = SDK.get<VersionControlSDKImpl>("VersionControl")

export namespace VersionControlSDK {
    export type State = {
        publications: VersionControl.PublicationMeta[]
        subscribedWorkflowId: Workflow.Id | null
    }

    export type Reducers = {
        upsertPublication: (pub: VersionControl.PublicationMeta) => void
        removePublication: (id: VersionControl.Publication.Id) => void
    }

    export type Actions = {
        publish: (payload: VersionControl.API.Publish.Request) => Promise<VersionControl.API.Publish.Response>
        list: (workflowId: Workflow.Id) => Promise<VersionControl.API.List.Response>
        get: (publicationId: VersionControl.Publication.Id) => Promise<VersionControl.API.Get.Response>
        activate: (publicationId: VersionControl.Publication.Id) => Promise<VersionControl.API.Activate.Response>
        deactivate: (publicationId: VersionControl.Publication.Id) => Promise<VersionControl.API.Deactivate.Response>
        remove: (publicationId: VersionControl.Publication.Id) => Promise<VersionControl.API.Remove.Response>
        subscribe: (workflowId: Workflow.Id) => void
        unsubscribe: () => void
    }

    export type Selectors = {
        activePublication: () => VersionControl.PublicationMeta | null
    }
}
