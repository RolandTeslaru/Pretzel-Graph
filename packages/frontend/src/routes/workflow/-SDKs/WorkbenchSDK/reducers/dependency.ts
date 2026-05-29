import { Foundations, type Workflow } from "@pretzel-graph/shared/domain"
import type { WorkbenchSDK } from "../sdk"
import { nodeReducers } from "./node"
import { ShelfSDK } from "../../ShelfSDK/sdk"
import { extractExposedPorts } from "@pretzel-graph/shared/subworkflow"

function collectUsedDependencyIds(s: WorkbenchSDK.State): Set<Workflow.Id> {
    const usedIds = new Set<Workflow.Id>()
    Object.values(s.data.nodes).forEach(node => {
        if (node.dependency && node.dependency.workflowId)
            usedIds.add(node.dependency.workflowId)
    })
    return usedIds
}

export const dependencyReducers = {
    published: {
        register: (s, dependency) => {
            dependencyReducers.removeUnused(s)
            s.data.dependencies.published[dependency.workflow_id] = dependency
        },
    },
    draft: {
        register: (s, draftDependency) => {
            dependencyReducers.removeUnused(s)
            s.data.dependencies.draft[draftDependency.workflow_id] = draftDependency
        },
    },
    attachToNode: (s, nodeId, workflowId, mode, dependency) => {
        if (mode === "publication")
            dependencyReducers.published.register(s, dependency as Workflow.Dependency.Publication)
        else
            dependencyReducers.draft.register(s, dependency as Workflow.Dependency.Draft)

        const blueprint = createBlueprintFromDependency(dependency)
        nodeReducers.recreate(s, nodeId, blueprint)

        s.data.staticValues[nodeId] ??= {}
        for (const field of dependency.workflow_data.fields ?? []) {
            if (field.id in s.data.staticValues[nodeId])
                continue
            if ("initialValue" in field)
                s.data.staticValues[nodeId][field.id] = field.initialValue
        }

        nodeReducers.setDependency(s, nodeId, { workflowId, mode })
        nodeReducers.validate(s, nodeId)
    },
    applyUpdate: (s, mode, dependency) => {
        const workflowId = dependency.workflow_id as Workflow.Id

        if (mode === "publication")
            dependencyReducers.published.register(s, dependency as Workflow.Dependency.Publication)
        else
            dependencyReducers.draft.register(s, dependency as Workflow.Dependency.Draft)

        const affectedNodeIds = Object.values(s.data.nodes)
            .filter(n => n.dependency?.workflowId === workflowId && n.dependency?.mode === mode)
            .map(n => n.id)

        const blueprint = createBlueprintFromDependency(dependency)
        for (const affectedNodeId of affectedNodeIds) {
            nodeReducers.recreate(s, affectedNodeId, blueprint)
            nodeReducers.validate(s, affectedNodeId)
        }

        if (mode === "publication")
            delete s.dependencyUpdates.published[workflowId]
        else
            delete s.dependencyUpdates.draft[workflowId]
    },
    setMode: (s, nodeId, mode) => {
        s.isDirty = true
        nodeReducers.recreate(s, nodeId, ShelfSDK.state.blueprints["Core.SubWorkflow.Execute" as Foundations.Blueprint.Id])
        const node = s.data.nodes[nodeId]
        
        node.dependency = {
            workflowId: null,
            mode,
        }

        nodeReducers.validate(s, nodeId)
    },
    removeUnused: (s) => {
        const usedIds = collectUsedDependencyIds(s)

        for (const id of Object.keys(s.data.dependencies.published) as Workflow.Id[])
            if (!usedIds.has(id)) delete s.data.dependencies.published[id]

        for (const id of Object.keys(s.data.dependencies.draft) as Workflow.Id[])
            if (!usedIds.has(id)) delete s.data.dependencies.draft[id]
    },
} satisfies DependencyReducers

type DependencyLike = {
    workflow_data: Workflow.Data
    display_name: string
    icon?: string | null
    accent?: string | null
}

export function createBlueprintFromDependency(dep: DependencyLike): Foundations.Blueprint {
    const base = ShelfSDK.state.blueprints["Core.SubWorkflow.Execute" as Foundations.Blueprint.Id]

    return {
        ...base,
        ...extractExposedPorts(dep.workflow_data),
        fields:      mergeFieldsById(base.fields, dep.workflow_data.fields ?? []),
        displayName: dep.display_name,
        icon:        dep.icon ?? base.icon,
        accent:      dep.accent ?? base.accent,
    } satisfies Foundations.Blueprint
}

function mergeFieldsById(
    baseFields: readonly Foundations.Field[],
    depFields:  readonly Foundations.Field[],
): Foundations.Field[] {
    const map = new Map<Foundations.Field.Id, Foundations.Field>()
    for (const f of baseFields) map.set(f.id, f)
    for (const f of depFields) if (!map.has(f.id)) map.set(f.id, f)
    return [...map.values()]
}

export interface DependencyReducers {
    applyUpdate: (
        state:      WorkbenchSDK.State,
        mode:       "publication" | "draft",
        dependency: Workflow.Dependency.Publication | Workflow.Dependency.Draft,
    ) => void
    attachToNode: (
        state:      WorkbenchSDK.State,
        nodeId:     Workflow.Node.Id,
        workflowId: Workflow.Id,
        mode:       "publication" | "draft",
        dependency: Workflow.Dependency.Publication | Workflow.Dependency.Draft,
    ) => void
    published: {
        register: (state: WorkbenchSDK.State, dependency: Workflow.Dependency.Publication) => void
    }
    draft: {
        register: (state: WorkbenchSDK.State, draftDependency: Workflow.Dependency.Draft) => void
    }
    setMode: (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, mode: "publication" | "draft") => void
    removeUnused: (state: WorkbenchSDK.State) => void
}
