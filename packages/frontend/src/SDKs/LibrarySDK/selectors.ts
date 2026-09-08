import { Library, Workflow } from '@pretzel-graph/shared/domain';
import type { LibrarySDK, LibrarySDKImpl } from './sdk';

const isVisible = (item: { hidden?: boolean | null }, showHidden: boolean) => showHidden || !item.hidden


export function _createLibrarySelectors_(sdk: LibrarySDKImpl) {
    return {

        // Immediate child folders of a folder.
        childFoldersOf: (folderId: Library.Folder.Id): Library.Folder[] => {
            const s = sdk.useStore.getState();
            return Object.values(s.folders).filter((f) => f.parent_folder_id === folderId && isVisible(f, s.showHidden));
        },

        // Workflows living directly inside a folder.
        workflowsInFolder: (folderId: Library.Folder.Id): Library.WorkflowMeta[] => {
            const s = sdk.useStore.getState();
            return Object.values(s.workflowMetas).filter((w) => w.folder_id === folderId && isVisible(w, s.showHidden));
        },

        // Root folder first, current folder last.
        getBreadcrumbs: (s: LibrarySDK.State, currentFolderId: Library.Folder.Id | undefined) => {
            let curFolder = currentFolderId ? s.folders[currentFolderId] as Library.Folder | undefined : undefined
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

            cwd.reverse();
            return cwd;
        },
        
        getLibraryView: (s: LibrarySDK.State, cwd: Library.Folder.Id) => {
            return {
                folders:   Object.values(s.folders).filter((f) => f.parent_folder_id === cwd && isVisible(f, s.showHidden)),
                worfklows: Object.values(s.workflowMetas).filter((w) => w.folder_id === cwd && isVisible(w, s.showHidden))
            }
        }
    }
}


export type _LibrarySDKSelectors = ReturnType<typeof _createLibrarySelectors_>;
