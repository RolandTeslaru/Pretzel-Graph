import { VersionControl, Workflow } from "@pretzel-graph/shared/domain";
import type { VersionControlSDK } from "./sdk";

export type State = VersionControlSDK.State;

export function createVersionControlSDKReducers() {
    return {
        deployments: {
            set: (s, deployments) => {
                s.deployments = deployments;
            },
            upsert: (s, publication) => {
                if (publication.is_deployed) {
                    s.deployments[publication.workflow_id] = publication;
                } else if (s.deployments[publication.workflow_id]?.id === publication.id) {
                    delete s.deployments[publication.workflow_id];
                }
            },
            remove: (s, workflowId) => {
                delete s.deployments[workflowId];
            },
        },
    } satisfies VersionControlSDKReducers;
}

export interface VersionControlSDKReducers {
    deployments: {
        set: (
            state: State,
            deployments: Record<Workflow.Id, VersionControl.Publication.Meta>,
        ) => void
        upsert: (
            state: State,
            publication: VersionControl.Publication.Meta,
        ) => void
        remove: (
            state: State,
            workflowId: Workflow.Id,
        ) => void
    }
}
