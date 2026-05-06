import { VersionControl } from "@pretzel-graph/shared/domain";
import type { VersionControlSDK } from "./sdk";

export const versionControlSDKSelectors = {
    getActive: (state) => {
        return state.currentWorkflowPublications.find(p => p.is_active) ?? null;
    },
} satisfies VersionControlSDKSelectors;

export type VersionControlSDKSelectors = {
    getActive: (state: VersionControlSDK.State) => VersionControl.Publication.Meta | null
};
