import { Library, Workflow } from '@vx-agent-editor/shared/domain';
import type { LibrarySDK, LibrarySDKImpl } from './sdk';


export function _createLibrarySelectors_(sdk: LibrarySDKImpl) {
    return {

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
        getBreadcrumbs: (s: LibrarySDK.State, currentFolderId: Library.Folder.Id, addProjectRoot: boolean = true) => {
            let curFolder = s.folders[currentFolderId] as Library.Folder | undefined;
            const cwd: {
                key: Library.Folder.Id,
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

            if (addProjectRoot) {
                // @ts-expect-error
                cwd.push({ key: "", name: "Projects" })
            }

            cwd.reverse();
            return cwd;
        }
    }
}


export type _LibrarySDKSelectors = ReturnType<typeof _createLibrarySelectors_>;
