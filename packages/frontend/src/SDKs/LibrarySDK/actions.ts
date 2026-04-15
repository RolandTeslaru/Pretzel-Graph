import { Library, Workflow } from '@vx-agent-editor/shared/domain';
import { api } from '../ApiInterceptorSDK';
import type { LibrarySDKImpl } from './sdk';

export type _LibrarySDKActions = {
    project: {
        list: () => Promise<Library.API.Project.List.Response>;
        create: (payload: Library.API.Project.Create.Request) => Promise<Library.API.Project.Create.Response>;
    };
    folder: {
        getContents: (id: Library.Folder.Id) => Promise<Library.API.Folder.GetContents.Response>;
        create: (payload: Library.API.Folder.Create.Request) => Promise<Library.API.Folder.Create.Response>;
        delete: (id: Library.Folder.Id) => Promise<Library.API.Folder.Remove.Response>;
    };
    workflow: {
        create: (payload: Library.API.Workflow.Create.Request) => Promise<Library.API.Workflow.Create.Response>;
        delete: (id: Workflow.Id) => Promise<Library.API.Workflow.Remove.Response>;
    };
};


export function _createLibraryActions_(sdk: LibrarySDKImpl) {
    const setState = sdk.useStore.setState;

    return {
        project: {
            list: async () => {
                const data = await Library.API.Project.list(api);
                setState((s) => {
                    for (const p of data) {
                        s.folders[p.id] = p;
                    }
                });
                return data;
            },

            create: async (payload) => {
                const data = await Library.API.Project.create(api, payload);
                setState((s) => { s.folders[data.id] = data; });
                return data;
            },
        },

        folder: {
            getContents: async (id) => {
                const data = await Library.API.Folder.getContents(api, { id });
                setState((s) => {
                    s.folders[data.folder.id] = data.folder;
                    for (const f of data.child_folders) s.folders[f.id] = f;
                    for (const w of data.workflows) s.workflowMetas[w.id] = w;
                });
                return data;
            },

            create: async (payload) => {
                const data = await Library.API.Folder.create(api, payload);
                setState((s) => { s.folders[data.id] = data; });
                return data;
            },

            delete: async (id) => {
                const data = await Library.API.Folder.remove(api, { id });
                setState((s) => {
                    delete s.folders[id];
                    // DB cascades; mirror.
                    for (const f of Object.values(s.folders)) if (f.parent_folder_id === id) delete s.folders[f.id];
                    for (const w of Object.values(s.workflowMetas)) if (w.folder_id === id) delete s.workflowMetas[w.id];
                });
                return data;
            },
        },

        workflow: {
            create: async (payload) => {
                const data = await Library.API.Workflow.create(api, payload);
                // Full Workflow returned; cache the meta projection (omit data).
                const { data: _data, ...meta } = data;
                setState((s) => { s.workflowMetas[data.id] = meta as Library.WorkflowMeta; });
                return data;
            },

            delete: async (id) => {
                const data = await Library.API.Workflow.remove(api, { id });
                setState((s) => { delete s.workflowMetas[id]; });
                return data;
            },
        },
    } satisfies _LibrarySDKActions
}
