import { Injectable, Logger } from '@nestjs/common';
import { Listing, Shelf, Workflow } from '@pretzel-graph/shared/domain';
import { ALL_DRAWERS, SECTIONS } from '@pretzel-graph/shared/constants/drawers';
import { Blueprint } from '@pretzel-graph/shared/domain/Foundations/Blueprint';
import { CloudService } from '../Cloud/cloud.service';
import * as fs from 'fs';
import * as path from 'path';

// Read once and held for the process; index changes arrive via a backend restart.
let index: Shelf.Index | null = null;

function getCoreIndex(): Shelf.Index {
    index ??= JSON.parse(fs.readFileSync(path.join(__dirname, '../../../assets/blueprint_index.json'), 'utf-8')) as Shelf.Index;

    return index;
}

@Injectable()
export class ShelfService {

    private readonly logger = new Logger(ShelfService.name);

    private extendedIndex: Record<Blueprint.Id, Blueprint> | null = null;

    constructor(private readonly cloud: CloudService) {}

    // The extended shelf blueprints, fetched from the registry once and kept for the process.
    async ensureExtendedShelfIndex(): Promise<Record<Blueprint.Id, Blueprint>> {
        if (this.extendedIndex)
            return this.extendedIndex;

        if (!this.cloud.isConfigured)
            return {};

        let listings: Listing[];

        try {
            listings = await this.getPretzelOfficialListings();
        } catch (error) {
            this.logger.warn(`Could not fetch the extended shelf: ${(error as Error).message}`);
            return {};
        }

        const base = getCoreIndex().blueprints['Core.SubWorkflow.Execute' as Blueprint.Id];
        const blueprints: Record<Blueprint.Id, Blueprint> = {};

        for (const listing of listings) {
            const blueprint = this.toExtendedBlueprint(base, listing);

            if (blueprint)
                blueprints[blueprint.id] = blueprint;
        }

        this.extendedIndex = blueprints;

        return blueprints;
    }

    private async getPretzelOfficialListings(): Promise<Listing[]> {
        const response = await this.cloud.fetch('/api/extended-shelf', { method: 'GET' });

        if (!response.ok)
            throw new Error(`Extended shelf answered ${response.status}`);

        return Listing.API.ExtendedShelf.Response.parse(await response.json()).workflows;
    }

    private toExtendedBlueprint(base: Blueprint, listing: Listing): Blueprint | null {
        try {
            return Workflow.toBlueprint(base, {
                id:            (listing.blueprintId ?? listing.id) as Blueprint.Id,
                meta:          listing.publicationMeta.workflow_meta,
                data:          listing.workflowData,
                dependencyRef: { workflowId: listing.id, mode: 'publication' },
            });
        } catch (error) {
            this.logger.warn(`Skipped extended shelf listing ${listing.id}: ${(error as Error).message}`);
            return null;
        }
    }

    getBlueprint(
        payload: Shelf.API.Blueprint.Get.Request
    ): { blueprint: Blueprint } {
        const index = getCoreIndex();
        const { blueprintId } = payload;
        const blueprint = index.blueprints[blueprintId] ?? this.extendedIndex?.[blueprintId];

        if (!blueprint)
            throw new Error(`Blueprint not found: ${blueprintId}`);

        return { blueprint };
    }


    async getBatchBlueprints(
        payload: Shelf.API.Blueprint.GetBatch.Request
    ): Promise<Shelf.API.Blueprint.GetBatch.Response> {
        const index = getCoreIndex();
        const { blueprintIds } = payload;
        const blueprints: Record<Blueprint.Id, Blueprint> = {};
        const failures = new Map<string, Blueprint.ResolutionFailure>();

        const addFailure = (failure: Blueprint.ResolutionFailure) => {
            const key = failure.code === "MISSING_BLUEPRINT"
                ? failure.blueprintId
                : failure.reconciledBlueprintId;

            failures.set(`${failure.code}:${key}`, failure);
        };

        for (const id of blueprintIds) {
            const blueprint = index.blueprints[id as Blueprint.Id]
                ?? (await this.ensureExtendedShelfIndex())[id as Blueprint.Id];
            if (blueprint) {
                blueprints[id as Blueprint.Id] = blueprint;
                continue;
            }

            if (!Blueprint.isReconciledId(id)) {
                addFailure({
                    code:        "MISSING_BLUEPRINT",
                    blueprintId: id,
                });
                continue;
            }

            // Not a base blueprint — replay its persisted derivative path.
            const blueprintId = Blueprint.extractBlueprintId(id);
            const base = index.blueprints[blueprintId];

            if (!base) {
                addFailure({
                    code:        "MISSING_BLUEPRINT",
                    blueprintId,
                });
                continue;
            }

            // A caller may request only the reconciled id. Always include the base as the recovery
            // target when the derivative can no longer be reconstructed.
            blueprints[blueprintId] = base;

            const path = id.slice(blueprintId.length + 1);
            try {
                blueprints[id as Blueprint.Id] = Blueprint.deriveByPath(base, path);
            } catch (error) {
                if (!(error instanceof Blueprint.Derivative.PathNotFoundError))
                    throw error;

                addFailure({
                    code:                  "MISSING_BLUEPRINT_DERIVATIVE",
                    blueprintId,
                    reconciledBlueprintId: id,
                    derivativePath:        path,
                });
            }
        }

        return {
            blueprints,
            resolutionFailures: [...failures.values()],
        };
    }


    async getAllInSection(
        payload: Shelf.API.Blueprint.GetAllInSection.Request
    ): Promise<{ blueprints: Record<Blueprint.Id, Blueprint> }> {
        const index = getCoreIndex();
        const { section } = payload;
        const drawerIds = SECTIONS[section];
        const blueprints: Record<Blueprint.Id, Blueprint> = {};

        drawerIds.forEach(drawerId => {
            const drawer = ALL_DRAWERS[drawerId];
            if (!drawer)
                return;
            drawer.blueprintIds.forEach(blueprintId => {
                const blueprint = index.blueprints[blueprintId as Blueprint.Id];
                if (blueprint)
                    blueprints[blueprintId as Blueprint.Id] = blueprint;
            });
        });

        if (section === 'core_extended')
            Object.assign(blueprints, await this.ensureExtendedShelfIndex());

        return { blueprints };
    }

    // Every blueprint a workflow's nodes reference, plus the repairs for the ones that no longer resolve.
    async collectWorkflowBlueprints(data: Workflow.Data): Promise<{ blueprints: Record<Blueprint.Id, Blueprint>; repairs: Workflow.Repair[] }> {
        const blueprintIds = new Set<Blueprint.Id>();

        for (const node of Object.values(data.nodes)) {
            blueprintIds.add(node.blueprintId);
            if (node.reconciledBlueprintId)
                blueprintIds.add(node.reconciledBlueprintId);
        }

        const { blueprints, resolutionFailures } = await this.getBatchBlueprints({
            blueprintIds: [...blueprintIds],
        });
        const repairs: Workflow.Repair[] = [];

        for (const failure of resolutionFailures) {
            for (const node of Object.values(data.nodes)) {
                if (failure.code === "MISSING_BLUEPRINT") {
                    // Dependency nodes may use a cosmetic blueprint id absent from the catalogue by design.
                    if (node.dependencyRef || node.blueprintId !== failure.blueprintId)
                        continue;

                    repairs.push({
                        code:        "MISSING_BLUEPRINT",
                        nodeId:      node.id,
                        blueprintId: failure.blueprintId,
                        resolution:  "REMOVE_NODE",
                    });
                    continue;
                }

                if (node.reconciledBlueprintId !== failure.reconciledBlueprintId)
                    continue;

                repairs.push({
                    code:                          "MISSING_BLUEPRINT_DERIVATIVE",
                    nodeId:                        node.id,
                    blueprintId:                   failure.blueprintId,
                    previousReconciledBlueprintId: failure.reconciledBlueprintId,
                    resolution:                    "RESET_TO_BASE",
                });
            }
        }

        return { blueprints, repairs };
    }
}
