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
    ): Promise<{ blueprints: Record<Blueprint.Id, Blueprint> }> {
        const index = loadIndex();
        const { blueprintIds } = payload;
        const blueprints: Record<Blueprint.Id, Blueprint> = {};

        for (const id of blueprintIds) {
            const blueprint = index.blueprints[id as Blueprint.Id];
            if (blueprint) {
                blueprints[id as Blueprint.Id] = blueprint;
                continue;
            }
            // Not a base blueprint — it's a reconciled id. Reconstruct it from its encoded values.
            if (Blueprint.isReconciledId(id)) {
                const { blueprintId, fieldValues } = Blueprint.parseReconciledId(id);
                const { reconciledBlueprint } = await this.reconcileBlueprint({ blueprintId, fieldValues });
                blueprints[id as Blueprint.Id] = reconciledBlueprint;
            }
        }

        return { blueprints };
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
