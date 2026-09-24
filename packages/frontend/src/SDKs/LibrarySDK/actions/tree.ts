import { Library, type Gateway, type Skill } from '@pretzel-graph/shared/domain';
import type { Tree as TreeDomain } from '@/components/Tree/domain';
import type { LibrarySDK, LibrarySDKImpl } from '../sdk';
import { GatewaySDK } from '@/SDKs/GatewaySDK/sdk';

export type FileSystemNodeData = { name: string; hidden?: boolean }
type FileNode = TreeDomain.Dummy.Branch<FileSystemNodeData>

// Rebuilds the browser tree from the folders, workflows and skills in the store, and the connections in GatewaySDK.
export function rebuildTree(sdk: LibrarySDKImpl) {
    sdk.useStore.setState((s) => {
        s.treeData = buildTreeData(s, GatewaySDK.state.connections)
    })
}

function buildTreeData(s: LibrarySDK.State, connections: Record<Gateway.Connection.Id, Gateway.Connection>): FileNode {
    const { folders, workflowMetas, skillMetas, treeExpandedByFolderId, showHidden } = s;

    const childFoldersByParent = new Map<string, Library.Folder[]>()
    const workflowsByFolder = new Map<string, Library.WorkflowMeta[]>()
    const skillsByFolder = new Map<string, Skill.Meta[]>()
    const connectionsByFolder = new Map<string, Gateway.Connection[]>()

    for (const folder of Object.values(folders)) {
        if (!folder.parent_folder_id) continue
        if (folder.hidden && !showHidden) continue

        const list = childFoldersByParent.get(folder.parent_folder_id) ?? []
        list.push(folder)
        childFoldersByParent.set(folder.parent_folder_id, list)
    }

    for (const workflow of Object.values(workflowMetas)) {
        if (workflow.hidden && !showHidden) continue

        const list = workflowsByFolder.get(workflow.folder_id) ?? []
        list.push(workflow)
        workflowsByFolder.set(workflow.folder_id, list)
    }

    for (const skill of Object.values(skillMetas)) {
        const list = skillsByFolder.get(skill.folder_id) ?? []
        list.push(skill)
        skillsByFolder.set(skill.folder_id, list)
    }

    for (const connection of Object.values(connections)) {
        const list = connectionsByFolder.get(connection.folderId) ?? []
        list.push(connection)
        connectionsByFolder.set(connection.folderId, list)
    }

    for (const list of connectionsByFolder.values()) {
        list.sort((a, b) => a.name.localeCompare(b.name))
    }
    for (const list of childFoldersByParent.values()) {
        list.sort((a, b) => a.display_name.localeCompare(b.display_name))
    }
    for (const list of workflowsByFolder.values()) {
        list.sort((a, b) => a.display_name.localeCompare(b.display_name))
    }
    for (const list of skillsByFolder.values()) {
        list.sort((a, b) => a.name.localeCompare(b.name))
    }

    const buildFolderBranch = (folder: Library.Folder): FileNode => {
        const childBranches: Record<string, FileNode> = {}
        for (const child of childFoldersByParent.get(folder.id) ?? [])
            childBranches[`folder:${child.id}`] = buildFolderBranch(child)
        for (const workflow of workflowsByFolder.get(folder.id) ?? [])
            childBranches[`workflow:${workflow.id}`] = {
                data: {
                    name: workflow.display_name,
                    hidden: workflow.hidden ?? false
                }
            }
        for (const skill of skillsByFolder.get(folder.id) ?? [])
            childBranches[`skill:${skill.id}`] = { data: { name: skill.name } }
        for (const connection of connectionsByFolder.get(folder.id) ?? [])
            childBranches[`connection:${connection.id}`] = { data: { name: connection.name } }

        return {
            data: {
                name: folder.display_name,
                hidden: folder.hidden ?? false
            },
            isExpandedByDefault: treeExpandedByFolderId[folder.id] ?? true,
            childBranches: (Object.keys(childBranches).length ? childBranches : undefined) as FileNode['childBranches'],
        }
    }

    const root = folders[Library.Folder.ROOT_ID]

    if (!root) return {}

    const childBranches: Record<string, FileNode> = {
        [`folder:${root.id}`]: buildFolderBranch(root),
    }

    return { childBranches: childBranches as FileNode['childBranches'] }
}
