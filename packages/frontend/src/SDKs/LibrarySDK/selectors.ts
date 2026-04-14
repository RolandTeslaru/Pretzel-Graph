import { Library, Workflow } from '@vx-agent-editor/shared/domain';
import type { LibrarySDKImpl } from './sdk';


export function _createLibrarySelectors_(sdk: LibrarySDKImpl) {
    return {
        // All projects, ordered newest-first.
        allProjects: (): Library.Project[] => {
            const s = sdk.useStore.getState();
            return Object.values(s.projects).sort(
                (a, b) => b.created_at.localeCompare(a.created_at),
            );
        },

        // Root folder id for a given project (O(1) via index).
        rootFolderIdOf: (projectId: Library.Project.Id): Library.Folder.Id | undefined => {
            return sdk.useStore.getState().rootFolderByProject[projectId];
        },

        // Immediate child folders of a folder.
        childFoldersOf: (folderId: Library.Folder.Id): Library.Folder[] => {
            const s = sdk.useStore.getState();
            return Object.values(s.folders).filter((f) => f.parent_folder_id === folderId);
        },

        // Workflows living directly inside a folder.
        workflowsInFolder: (folderId: Library.Folder.Id): Library.WorkflowMeta[] => {
            const s = sdk.useStore.getState();
            return Object.values(s.workflowMetas).filter((w) => w.folder_id === folderId);
        },
    }
}


export type _LibrarySDKSelectors = ReturnType<typeof _createLibrarySelectors_>;
