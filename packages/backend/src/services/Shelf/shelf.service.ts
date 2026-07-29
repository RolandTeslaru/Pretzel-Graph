import { Injectable } from '@nestjs/common';
import { Shelf } from '@pretzel-graph/shared/domain';
import { ALL_DRAWERS, SECTIONS } from '@pretzel-graph/shared/constants/drawers';
import { CatalogueService, pickReconcilingValues } from "@pretzel-graph/node-sdk"
import { Blueprint } from '@pretzel-graph/shared/domain/Foundations/Blueprint';
import { cloneDeep } from 'lodash';
import * as fs from 'fs';
import * as path from 'path';

function loadIndex(): Shelf.Index {
    const raw = fs.readFileSync(path.join(__dirname, 'node_index.json'), 'utf-8');
    return JSON.parse(raw) as Shelf.Index;
}

@Injectable()
export class ShelfService {
    getBlueprint(
        payload: Shelf.API.Blueprint.Get.Request
    ): { blueprint: Blueprint } {
        const index = loadIndex();
        const { blueprintId } = payload;
        const blueprint = index.blueprints[blueprintId];

        if (!blueprint)
            throw new Error(`Blueprint not found: ${blueprintId}`);

        return { blueprint };
    }


    async getBatchBlueprints(
        payload: Shelf.API.Blueprint.GetBatch.Request
    ): Promise<Shelf.API.Blueprint.GetBatch.Response> {
        const index = loadIndex();
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
            const blueprint = index.blueprints[id as Blueprint.Id];
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

            // Not a base blueprint — it's a reconciled id. Reconstruct it from its encoded values.
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
            const isDerivativePath = path
                .split(Blueprint.Derivative.SEPARATOR)
                .some(token => Blueprint.Derivative.parseKey(token) !== null);

            // A derivative id encodes the matched path, not field=value pairs — replay it
            // directly rather than putting it through parseReconciledId.
            if (base._derivatives?.length || isDerivativePath) {
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
                continue;
            }

            const { fieldValues } = Blueprint.parseReconciledId(id);
            const { reconciledBlueprint } = await this.reconcileBlueprint({ blueprintId, fieldValues });
            blueprints[id as Blueprint.Id] = reconciledBlueprint;
        }

        return {
            blueprints,
            resolutionFailures: [...failures.values()],
        };
    }


    getAllInSection(
        payload: Shelf.API.Blueprint.GetAllInSection.Request
    ): { blueprints: Record<Blueprint.Id, Blueprint> } {
        const index = loadIndex();
        const { section } = payload;
        // @ts-expect-error
        const drawerIds = SECTIONS[section] as Shelf.Drawer.Id[];
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

        return { blueprints };
    }

    async reconcileBlueprint(
        payload: Shelf.API.Blueprint.Reconcile.Request
): Promise<Shelf.API.Blueprint.Reconcile.Response> {
        const { blueprintId, fieldValues } = payload;
        const { blueprint } = this.getBlueprint({ blueprintId });

        // Derivative blueprints fold their own tree — no reconcile.ts involved.
        if (blueprint._derivatives?.length) {
            const { blueprint: reconciledBlueprint } = Blueprint.derive(blueprint, fieldValues);
            return { reconciledBlueprint };
        }

        const reconcileFn = await CatalogueService.getReconciler(blueprintId);
        if (!reconcileFn)
            throw new Error(`Reconciler for node ${blueprintId} not found`);

        // Reconcilers mutate a fresh deep copy of the base and see only reconcile-field values.
        const reconciledBlueprint = reconcileFn(
            cloneDeep(blueprint),
            pickReconcilingValues(blueprint.fields, fieldValues),
        );

        return { reconciledBlueprint };
    }
}
