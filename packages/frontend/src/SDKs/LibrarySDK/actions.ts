import { Library, Workflow } from '@vx-agent-editor/shared/domain';
import { api } from '../ApiInterceptorSDK';
import type { LibrarySDKImpl } from './sdk';


export function _createLibraryActions_(sdk: LibrarySDKImpl) {
    const setState = sdk.useStore.setState;

    return {
        project: {
            list: async (): Promise<Library.API.Project.List.Response> => {
                const { data } = await api.get<Library.API.Project.List.Response>('/api/library/projects');
                setState((s) => {
                    for (const p of data) {
                        s.projects[p.id] = p;
                        if (p.root_folder_id) s.rootFolderByProject[p.id] = p.root_folder_id;
                    }
                });
                return data;
            },

            create: async (payload: Library.API.Project.Create.Request): Promise<Library.API.Project.Create.Response> => {
                const { data } = await api.post<Library.API.Project.Create.Response>('/api/library/projects', payload);
                setState((s) => { s.projects[data.id] = data; });
                return data;
            },

            delete: async (id: Library.Project.Id): Promise<Library.API.Project.Delete.Response> => {
                const { data } = await api.delete<Library.API.Project.Delete.Response>(`/api/library/projects/${id}`);
                setState((s) => {
                    delete s.projects[id];
                    delete s.rootFolderByProject[id];
                    // DB cascades to folders + workflows; mirror that in cache.
                    for (const f of Object.values(s.folders)) if (f.project_id === id) delete s.folders[f.id];
                    for (const w of Object.values(s.workflowMetas)) {
                        const folder = s.folders[w.folder_id];
                        if (!folder) delete s.workflowMetas[w.id];
                    }
                });
                return data;
            },
        },

        folder: {
            getContents: async (id: Library.Folder.Id): Promise<Library.API.Folder.GetContents.Response> => {
                const { data } = await api.get<Library.API.Folder.GetContents.Response>(`/api/library/folders/${id}/contents`);
                setState((s) => {
                    s.folders[data.folder.id] = data.folder;
                    for (const f of data.child_folders) s.folders[f.id] = f;
                    for (const w of data.workflows) s.workflowMetas[w.id] = w;
                });
                return data;
            },

            create: async (payload: Library.API.Folder.Create.Request): Promise<Library.API.Folder.Create.Response> => {
                const { data } = await api.post<Library.API.Folder.Create.Response>('/api/library/folders', payload);
                setState((s) => { s.folders[data.id] = data; });
                return data;
            },

            delete: async (id: Library.Folder.Id): Promise<Library.API.Folder.Delete.Response> => {
                const { data } = await api.delete<Library.API.Folder.Delete.Response>(`/api/library/folders/${id}`);
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
            create: async (payload: Library.API.Workflow.Create.Request): Promise<Library.API.Workflow.Create.Response> => {
                const { data } = await api.post<Library.API.Workflow.Create.Response>('/api/library/workflows', payload);
                // Full Workflow returned; cache the meta projection (omit data).
                const { data: _data, ...meta } = data;
                setState((s) => { s.workflowMetas[data.id] = meta as Library.WorkflowMeta; });
                return data;
            },

            delete: async (id: Workflow.Id): Promise<Library.API.Workflow.Delete.Response> => {
                const { data } = await api.delete<Library.API.Workflow.Delete.Response>(`/api/library/workflows/${id}`);
                setState((s) => { delete s.workflowMetas[id]; });
                return data;
            },
        },
    }
}


export type _LibrarySDKActions = ReturnType<typeof _createLibraryActions_>;
