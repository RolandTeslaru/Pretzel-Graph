import { Library, Workflow } from '@pretzel-graph/shared/domain';
import { api } from '../ApiInterceptorSDK';
import type { LibrarySDKImpl } from './sdk';
import type { LibrarySDK } from './sdk';
import type { Tree as TreeDomain } from '@/components/Tree/domain';

export type FileSystemNodeData = { name: string }
type FileNode = TreeDomain.Dummy.Branch<FileSystemNodeData>

// Folders and workflows with no parent are grouped under this key.
const ROOT_KEY = ''

export type _LibrarySDKActions = {
    rebuildTree: () => void;
    preferences: {
        setFolderExpanded: (folderId: Library.Folder.Id, isExpanded: boolean) => void;
    };
    bootstrap: {
        get: () => Promise<Library.API.Bootstrap.Get.Response>;
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
        setLock: (id: Workflow.Id, locked: boolean) => Promise<Library.API.Workflow.Update.Response>;
        delete: (id: Workflow.Id) => Promise<Library.API.Workflow.Remove.Response>;
        duplicate: (id: Workflow.Id) => Promise<Library.API.Workflow.Duplicate.Response>;
    };
};


function buildTreeData(s: LibrarySDK.State): FileNode {
    const { folders, workflowMetas, treeExpandedByFolderId } = s;

    const childFoldersByParent = new Map<string, Library.Folder[]>()
    const workflowsByFolder = new Map<string, Library.WorkflowMeta[]>()

    for (const folder of Object.values(folders)) {
        const parentKey = folder.parent_folder_id ?? ROOT_KEY
        const list = childFoldersByParent.get(parentKey) ?? []
        list.push(folder)
        childFoldersByParent.set(parentKey, list)
    }

    for (const workflow of Object.values(workflowMetas)) {
        const folderKey = workflow.folder_id ?? ROOT_KEY
        const list = workflowsByFolder.get(folderKey) ?? []
        list.push(workflow)
        workflowsByFolder.set(folderKey, list)
    }

    for (const list of childFoldersByParent.values()) {
        list.sort((a, b) => a.display_name.localeCompare(b.display_name))
    }
    for (const list of workflowsByFolder.values()) {
        list.sort((a, b) => a.display_name.localeCompare(b.display_name))
    }

    const buildFolderBranch = (folder: Library.Folder): FileNode => {
        const childBranches: Record<string, FileNode> = {}
        for (const child of childFoldersByParent.get(folder.id) ?? [])
            childBranches[`folder:${child.id}`] = buildFolderBranch(child)
        for (const workflow of workflowsByFolder.get(folder.id) ?? [])
            childBranches[`workflow:${workflow.id}`] = { data: { name: workflow.display_name } }

        return {
            data: { name: folder.display_name },
            isExpandedByDefault: treeExpandedByFolderId[folder.id] ?? true,
            childBranches: (Object.keys(childBranches).length ? childBranches : undefined) as FileNode['childBranches'],
        }
    }

    const childBranches: Record<string, FileNode> = {}
    for (const folder of childFoldersByParent.get(ROOT_KEY) ?? [])
        childBranches[`folder:${folder.id}`] = buildFolderBranch(folder)
    for (const workflow of workflowsByFolder.get(ROOT_KEY) ?? [])
        childBranches[`workflow:${workflow.id}`] = { data: { name: workflow.display_name } }

    return { childBranches: childBranches as FileNode['childBranches'] }
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

            duplicate: async (id) => {
                const data = await Library.API.Workflow.duplicate(api, { id });
                const { data: _data, ...meta } = data;
                setState((s) => { s.workflowMetas[data.id] = meta as Library.WorkflowMeta; });
                rebuildTree();
                return data;
            },
        },
    } satisfies _LibrarySDKActions
}
