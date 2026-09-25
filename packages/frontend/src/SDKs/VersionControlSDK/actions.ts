import { Deployment, VersionControl, Workflow } from "@pretzel-graph/shared/domain";
import { api } from "../ApiInterceptorSDK";
import { LibrarySDK } from "../LibrarySDK/sdk";
import type { VersionControlSDKImpl } from "./sdk";

export const createVersionControlSDKActions = (sdk: VersionControlSDKImpl) => {
    const applyDeployed = (publication: VersionControl.Publication) => {
        sdk.setState(s => { s.reducers.deployments.upsert(s, publication) });
        void sdk.invalidate(sdk.query.publications(publication.workflow_id));
    };

    return {
        publish: async (workflowId, payload) => {
            const data = await VersionControl.API.publish(api, workflowId, payload);
            void sdk.invalidate(sdk.query.publications(workflowId));
            return data;
        },

        list: async (workflowId) => {
            return VersionControl.API.list(api, workflowId);
        },

        get: async (publicationId) => {
            return VersionControl.API.get(api, publicationId);
        },

        remove: async (workflowId, publicationId) => {
            const data = await VersionControl.API.remove(api, workflowId, publicationId);
            const wasDeployed = sdk.state.deployments[workflowId]?.id === publicationId;
            if (wasDeployed) {
                sdk.setState(s => { s.reducers.deployments.remove(s, workflowId) });
                LibrarySDK.actions.workflow.__removeListingId(workflowId);
            }
            void sdk.invalidate(sdk.query.publications(workflowId));
            return data;
        },

        listDeployments: async () => {
            const data = await Deployment.API.list(api);
            sdk.setState(s => { s.reducers.deployments.set(s, data.deployments) });
            return data;
        },

        getDeployment: async (workflowId) => {
            const data = await Deployment.API.get(api, workflowId);
            sdk.setState(s => {
                if (data.publication) s.reducers.deployments.upsert(s, data.publication);
                else s.reducers.deployments.remove(s, workflowId);
            });
            return data;
        },

        deployWorkflow: async (workflowId) => {
            const data = await Deployment.API.deployWorkflow(api, workflowId);
            applyDeployed(data.publication);
            return data;
        },

        deployPublication: async (workflowId, publicationId) => {
            const data = await Deployment.API.deployPublication(api, workflowId, publicationId);
            applyDeployed(data.publication);
            return data;
        },

        undeploy: async (workflowId) => {
            const data = await Deployment.API.undeploy(api, workflowId);
            sdk.setState(s => { s.reducers.deployments.remove(s, workflowId) });
            LibrarySDK.actions.workflow.__removeListingId(workflowId);
            void sdk.invalidate(sdk.query.publications(workflowId));
            return data;
        },
    } satisfies VersionControlSDKActions;
};

export type VersionControlSDKActions = {
    publish: (workflowId: Workflow.Id, payload: VersionControl.API.Publish.Request) => Promise<VersionControl.API.Publish.Response>
    list: (workflowId: Workflow.Id) => Promise<VersionControl.API.List.Response>
    get: (publicationId: VersionControl.Publication.Id) => Promise<VersionControl.API.Get.Response>
    remove: (workflowId: Workflow.Id, publicationId: VersionControl.Publication.Id) => Promise<VersionControl.API.Remove.Response>
    listDeployments: () => Promise<Deployment.API.List.Response>
    getDeployment: (workflowId: Workflow.Id) => Promise<Deployment.API.Get.Response>
    deployWorkflow: (workflowId: Workflow.Id) => Promise<Deployment.API.DeployWorkflow.Response>
    deployPublication: (workflowId: Workflow.Id, publicationId: VersionControl.Publication.Id) => Promise<Deployment.API.DeployPublication.Response>
    undeploy: (workflowId: Workflow.Id) => Promise<Deployment.API.Undeploy.Response>
};
