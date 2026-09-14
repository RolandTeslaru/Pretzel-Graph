import type { Dependency } from "../../../../Dependency";
import { Workflow } from "../../../../Workflow";
import type { Field } from "../../../../Foundations/Field";
import type { Document } from "../../index";
import { dependencySelectors } from "../dependency";

export interface NodeDependencySelectors {
    // Read plain workflow data only, so callers outside the editor can pass `{ data }`.
    getShapeRef:   (document: { data: Pick<Workflow.Data, "staticValues"> }, nodeId: Workflow.Node.Id) => Dependency.Ref.Workflow | null
    getShapeValue: (document: { data: Pick<Workflow.Data, "staticValues" | "dependencies"> }, nodeId: Workflow.Node.Id) => Dependency | null
    // The graph of the workflow the shape dependency points at.
    getShapeData:  (document: { data: Pick<Workflow.Data, "staticValues" | "dependencies"> }, nodeId: Workflow.Node.Id) => Workflow.Data | null
    // Every Dependency field value on the node, the shape dependency included.
    getRefs:       (document: Document, nodeId: Workflow.Node.Id) => Dependency.Ref.Workflow[]
    // Pending updates for the dependencies the node's fields point at, one per dependency.
    getUpdates:    (document: Document, nodeId: Workflow.Node.Id) => Dependency.Update[]
    hasUpdates:    (document: Document, nodeId: Workflow.Node.Id) => boolean
}

export const nodeDependencySelectors: NodeDependencySelectors = {
    getShapeRef: (d, nodeId) => {
        const value = d.data.staticValues[nodeId]?.[Workflow.Node.SHAPE_DEPENDENCY_FIELD_ID];

        return (value as unknown as Dependency.Ref.Workflow | undefined) ?? null;
    },
    getShapeValue: (d, nodeId) => {
        const shapeDepRef = nodeDependencySelectors.getShapeRef(d, nodeId);
        if (!shapeDepRef)
            return null;

        return dependencySelectors.getWorkflow(d, shapeDepRef.id, shapeDepRef.kind);
    },
    getShapeData: (d, nodeId) => {
        const shapeDepRef = nodeDependencySelectors.getShapeRef(d, nodeId);
        if (!shapeDepRef)
            return null;

        if (shapeDepRef.kind === "draftWorkflow")
            return d.data.dependencies.draftWorkflow[shapeDepRef.id]?.data ?? null;

        return d.data.dependencies.publishedWorkflow[shapeDepRef.id]?.workflow_data ?? null;
    },
    getRefs: (d, nodeId) => {
        const values = d.data.staticValues[nodeId] ?? {};
        const ids    = new Set<Field.Id>([Workflow.Node.SHAPE_DEPENDENCY_FIELD_ID]);

        for (const field of d.selectors.node.getFields(d, nodeId))
            if (field.variant === "Dependency")
                ids.add(field.id);

        return [...ids]
            .map(id => values[id] as unknown as Dependency.Ref.Workflow | undefined)
            .filter((ref): ref is Dependency.Ref.Workflow => !!ref);
    },
    getUpdates: (d, nodeId) => {
        const refs = new Set(d.selectors.node.dependency.getRefs(d, nodeId).map(ref => `${ref.kind}:${ref.id}`));

        return d.selectors.dependency.getUpdates(d).filter(update => refs.has(`${update.kind}:${update.id}`));
    },
    hasUpdates: (d, nodeId) => d.selectors.node.dependency.getUpdates(d, nodeId).length > 0,
}
