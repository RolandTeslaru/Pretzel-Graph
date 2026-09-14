import { Library } from '@pretzel-graph/shared/domain';
import { api } from '@/SDKs/ApiInterceptorSDK';
import type { LibrarySDKImpl } from '../sdk';
import { rebuildTree } from './tree';
import { putMeta } from './workflow';
import { putSkillMeta } from './skill';

export type FolderActions = {
    getContents: (id: Library.Folder.Id) => Promise<Library.API.Folder.GetContents.Response>;
    create: (payload: Library.API.Folder.Create.Request) => Promise<Library.API.Folder.Create.Response>;
    update: (payload: Library.API.Folder.Update.Request) => Promise<Library.API.Folder.Update.Response>;
    setHidden: (id: Library.Folder.Id, hidden: boolean) => Promise<Library.API.Folder.Update.Response>;
    move: (id: Library.Folder.Id, parentFolderId: Library.Folder.Id) => Promise<Library.API.Folder.Update.Response>;
    delete: (id: Library.Folder.Id) => Promise<Library.API.Folder.Remove.Response>;
};

export function createFolderActions(sdk: LibrarySDKImpl) {
    const setState = sdk.useStore.setState;

    return {
        getContents: async (id) => {
            const data = await Library.API.Folder.getContents(api, { id });
            setState((s) => {
                s.folders[data.folder.id] = data.folder;
                for (const f of data.child_folders) s.folders[f.id] = f;
                for (const w of data.workflows) putMeta(s, w);
                for (const k of data.skills) putSkillMeta(s, k);
            });
            rebuildTree(sdk);
            return data;
        },

        create: async (payload) => {
            const data = await Library.API.Folder.create(api, payload);
            setState((s) => { s.folders[data.id] = data; });
            rebuildTree(sdk);
            return data;
        },

        update: async (payload) => {
            const data = await Library.API.Folder.update(api, payload);
            setState((s) => { s.folders[data.id] = data; });
            rebuildTree(sdk);
            return data;
        },

        setHidden: async (id, hidden) => {
            const data = await Library.API.Folder.update(api, { id, hidden });
            setState((s) => { s.folders[data.id] = data; });
            rebuildTree(sdk);
            return data;
        },

        move: async (id, parentFolderId) => {
            const data = await Library.API.Folder.update(api, { id, parent_folder_id: parentFolderId });
            setState((s) => { s.folders[data.id] = data; });
            rebuildTree(sdk);
            return data;
        },

        delete: async (id) => {
            const data = await Library.API.Folder.remove(api, { id });
            setState((s) => {
                delete s.folders[id];
                // DB cascades; mirror.
                for (const f of Object.values(s.folders)) if (f.parent_folder_id === id) delete s.folders[f.id];
                for (const w of Object.values(s.workflowMetas)) if (w.folder_id === id) delete s.workflowMetas[w.id];
                for (const k of Object.values(s.skillMetas)) if (k.folder_id === id) delete s.skillMetas[k.id];
            });
            rebuildTree(sdk);
            return data;
        },
    } satisfies FolderActions
}
