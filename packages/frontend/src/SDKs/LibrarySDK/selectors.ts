import { Library, Workflow } from '@pretzel-graph/shared/domain';
import type { LibrarySDK, LibrarySDKImpl } from './sdk';


export function _createLibrarySelectors_(sdk: LibrarySDKImpl) {
    return {

        // Immediate child folders of a folder. null is the root.
        childFoldersOf: (folderId: Library.Folder.Id | null): Library.Folder[] => {
            const s = sdk.useStore.getState();
            return Object.values(s.folders).filter((f) => f.parent_folder_id === folderId);
        },

        // Workflows living directly inside a folder. null is the root.
        workflowsInFolder: (folderId: Library.Folder.Id | null): Library.WorkflowMeta[] => {
            const s = sdk.useStore.getState();
            return Object.values(s.workflowMetas).filter((w) => w.folder_id === folderId);
        },

        // Root first, current folder last. The root crumb carries an empty key.
        getBreadcrumbs: (s: LibrarySDK.State, currentFolderId: Library.Folder.Id | null | undefined) => {
            let curFolder = currentFolderId ? s.folders[currentFolderId] as Library.Folder | undefined : undefined
            const cwd: {
                key: string,
                name: string
            }[] = []

            while(curFolder !== undefined){
                cwd.push({
                    key: curFolder.id,
                    name: curFolder.display_name
                });
                if(curFolder.parent_folder_id){
                    curFolder = s.folders[curFolder.parent_folder_id];
                }
                else
                    curFolder = undefined
            }

            cwd.push({ key: "", name: "Library" })

            cwd.reverse();
            return cwd;
        }
    }
}


export type _LibrarySDKSelectors = ReturnType<typeof _createLibrarySelectors_>;
