import { VersionControl, Workflow } from "@pretzel-graph/shared/domain";
import type { VersionControlSDK, VersionControlSDKImpl } from "./sdk";

export type State = VersionControlSDK.State;

export function createVersionControlSDKReducers(_sdk: VersionControlSDKImpl) {
    return {
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
    } satisfies VersionControlSDKReducers;
}

export interface VersionControlSDKReducers {
    currentWorkflow: {
        set: (
            state: State,
            publications: VersionControl.Publication.Meta[],
        ) => void
        upsert: (
            state: State,
            publication: VersionControl.Publication.Meta,
        ) => void
        deactivateAll: (state: State) => void
        remove: (
            state: State,
            publicationId: VersionControl.Publication.Id,
        ) => void
    }
    activeWorkflows: {
        set: (
            state: State,
            activeWorkflows: Record<Workflow.Id, VersionControl.Publication.Meta>,
        ) => void
        upsert: (
            state: State,
            publication: VersionControl.Publication.Meta,
        ) => void
        removeByWorkflowId: (
            state: State,
            workflowId: Workflow.Id,
        ) => void
        removeByPublicationId: (
            state: State,
            publicationId: VersionControl.Publication.Id,
        ) => void
    }
    subscription: {
        setWorkflow: (
            state: State,
            workflowId: Workflow.Id | null,
        ) => void
    }
}
