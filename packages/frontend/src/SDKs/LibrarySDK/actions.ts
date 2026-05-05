import { Library, Workflow } from '@pretzel-graph/shared/domain';
import { api } from '../ApiInterceptorSDK';
import type { LibrarySDKImpl } from './sdk';
import type { LibrarySDK } from './sdk';
import { SystemIcons } from '@pretzel-graph/standard-ui/icons';
import type { TreeDataItem } from '@pretzel-graph/standard-ui/components/Tree/tree-view';

export type _LibrarySDKActions = {
    rebuildTree: () => void;
    preferences: {
        setFolderExpanded: (folderId: Library.Folder.Id, isExpanded: boolean) => void;
    };
    bootstrap: {
        get: () => Promise<Library.API.Bootstrap.Get.Response>;
    };
    project: {
        list: () => Promise<Library.API.Project.List.Response>;
        create: (payload: Library.API.Project.Create.Request) => Promise<Library.API.Project.Create.Response>;
        update: (payload: Library.API.Project.Update.Request) => Promise<Library.API.Project.Update.Response>;
    };
    folder: {
        getContents: (id: Library.Folder.Id) => Promise<Library.API.Folder.GetContents.Response>;
        create: (payload: Library.API.Folder.Create.Request) => Promise<Library.API.Folder.Create.Response>;
        update: (payload: Library.API.Folder.Update.Request) => Promise<Library.API.Folder.Update.Response>;
        delete: (id: Library.Folder.Id) => Promise<Library.API.Folder.Remove.Response>;
    };
    workflow: {
        upsertMeta: (meta: Library.WorkflowMeta) => void;
        create: (payload: Library.API.Workflow.Create.Request) => Promise<Library.API.Workflow.Create.Response>;
        update: (payload: Library.API.Workflow.Update.Request) => Promise<Library.API.Workflow.Update.Response>;
        setVisibility: (id: Workflow.Id, isPublic: boolean) => Promise<Library.API.Workflow.Update.Response>;
        setLock: (id: Workflow.Id, locked: boolean) => Promise<Library.API.Workflow.Update.Response>;
        delete: (id: Workflow.Id) => Promise<Library.API.Workflow.Remove.Response>;
    };
};


function buildTreeData(s: LibrarySDK.State): TreeDataItem[] {
    const { folders, workflowMetas, treeExpandedByFolderId } = s;

    const childFoldersByParent = new Map<string, Library.Folder[]>()
    const workflowsByFolder = new Map<string, Library.WorkflowMeta[]>()

    for (const folder of Object.values(folders)) {
        if (folder.parent_folder_id) {
            const list = childFoldersByParent.get(folder.parent_folder_id) ?? []
            list.push(folder)
            childFoldersByParent.set(folder.parent_folder_id, list)
        }
    }

    for (const workflow of Object.values(workflowMetas)) {
        const list = workflowsByFolder.get(workflow.folder_id) ?? []
        list.push(workflow)
        workflowsByFolder.set(workflow.folder_id, list)
    }

    for (const list of childFoldersByParent.values()) {
        list.sort((a, b) => a.display_name.localeCompare(b.display_name))
    }
    for (const list of workflowsByFolder.values()) {
        list.sort((a, b) => a.display_name.localeCompare(b.display_name))
    }

    const buildFolderNode = (folder: Library.Folder): TreeDataItem => {
        const folderChildren = (childFoldersByParent.get(folder.id) ?? []).map(buildFolderNode)
        const workflowChildren = (workflowsByFolder.get(folder.id) ?? []).map((workflow) => ({
            id: `workflow:${workflow.id}`,
            name: workflow.display_name,
            icon: SystemIcons.Graph,
            selectedIcon: SystemIcons.Graph,
        }))

        const children = [...folderChildren, ...workflowChildren]

        return {
            id: `folder:${folder.id}`,
            name: folder.display_name,
            icon: SystemIcons.Folder,
            openIcon: SystemIcons.FolderOpen,
            selectedIcon: SystemIcons.FolderOpen,
            expanded: treeExpandedByFolderId[folder.id] ?? true,
            children: children.length > 0 ? children : undefined,
        }
    }

    const roots = Object.values(folders)
        .filter((f) => f.is_root)
        .sort((a, b) => a.display_name.localeCompare(b.display_name))

    return roots.map(buildFolderNode)
}

export function _createLibraryActions_(sdk: LibrarySDKImpl) {
    const setState = sdk.useStore.setState;

    const rebuildTree = () => {
        setState((s) => {
            s.treeData = buildTreeData(s)
        })
    }

    return {
        rebuildTree,

        preferences: {
            setFolderExpanded: (folderId, isExpanded) => {
                setState((s) => {
                    s.treeExpandedByFolderId[folderId] = isExpanded;
                });
                rebuildTree();
            },
        },

        bootstrap: {
            get: async () => {
                const data = await Library.API.Bootstrap.get(api);
                setState((s) => {
                    s.folders = Object.fromEntries(data.folders.map((f) => [f.id, f])) as typeof s.folders;
                    s.workflowMetas = Object.fromEntries(data.workflow_metas.map((w) => [w.id, w])) as typeof s.workflowMetas;
                });
                rebuildTree();
                return data;
            },
        },

        project: {
            list: async () => {
                const data = await Library.API.Project.list(api);
                setState((s) => {
                    for (const p of data) {
                        s.folders[p.id] = p;
                    }
                });
                rebuildTree();
                return data;
            },

            create: async (payload) => {
                const data = await Library.API.Project.create(api, payload);
                setState((s) => { s.folders[data.id] = data; });
                rebuildTree();
                return data;
            },

            update: async (payload) => {
                const data = await Library.API.Project.update(api, payload);
                setState((s) => { s.folders[data.id] = data; });
                rebuildTree();
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
                rebuildTree();
                return data;
            },

            create: async (payload) => {
                const data = await Library.API.Folder.create(api, payload);
                setState((s) => { s.folders[data.id] = data; });
                rebuildTree();
                return data;
            },

            update: async (payload) => {
                const data = await Library.API.Folder.update(api, payload);
                setState((s) => { s.folders[data.id] = data; });
                rebuildTree();
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
                rebuildTree();
                return data;
            },
        },

        workflow: {
            // Used by non-Library creation flows (e.g. Workbench createSubWorkflow)
            // to keep the Library tree in sync without triggering a full bootstrap.
            upsertMeta: (meta) => {
                setState((s) => { s.workflowMetas[meta.id] = meta; });
                rebuildTree();
            },

            create: async (payload) => {
                const data = await Library.API.Workflow.create(api, payload);
                // Full Workflow returned; cache the meta projection (omit data).
                const { data: _data, ...meta } = data;
                setState((s) => { s.workflowMetas[data.id] = meta as Library.WorkflowMeta; });
                rebuildTree();
                return data;
            },

            update: async (payload) => {
                const data = await Library.API.Workflow.update(api, payload);
                setState((s) => { s.workflowMetas[data.id] = data; });
                rebuildTree();
                return data;
            },

            setVisibility: async (id, isPublic) => {
                const data = await Library.API.Workflow.update(api, { id, is_public: isPublic });
                setState((s) => { s.workflowMetas[data.id] = data; });
                return data;
            },

            setLock: async (id, locked) => {
                const data = await Library.API.Workflow.update(api, { id, locked });
                setState((s) => { s.workflowMetas[data.id] = data; });
                return data;
            },

            delete: async (id) => {
                const data = await Library.API.Workflow.remove(api, { id });
                setState((s) => { delete s.workflowMetas[id]; });
                rebuildTree();
                return data;
            },
        },
    } satisfies _LibrarySDKActions
}
