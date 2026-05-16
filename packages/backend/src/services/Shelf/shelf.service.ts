import { Injectable } from '@nestjs/common';
import { Shelf } from '@pretzel-graph/shared/domain';
import { ALL_DRAWERS, SECTIONS } from '@pretzel-graph/shared/constants/drawers';
import { CatalogueService } from "@pretzel-graph/node-sdk"
import { Blueprint } from '@pretzel-graph/shared/domain/Foundations/Blueprint';
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


    getBatchBlueprints(
        payload: Shelf.API.Blueprint.GetBatch.Request
    ): { blueprints: Record<Blueprint.Id, Blueprint> } {
        const index = loadIndex();
        const { blueprintIds } = payload;
        const blueprints: Record<Blueprint.Id, Blueprint> = {};

        blueprintIds.forEach(blueprintId => {
            const blueprint = index.blueprints[blueprintId as Blueprint.Id];
            if (blueprint)
                blueprints[blueprintId as Blueprint.Id] = blueprint;
        });

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
        const { blueprint, fieldId, newValue } = payload;
        const reconcileFn = await CatalogueService.getReconciler(blueprint.id);

        if (!reconcileFn)
            throw new Error(`Reconciler for node ${blueprint.id} not found`);

        const reconciledBlueprint = reconcileFn(blueprint, fieldId, newValue);

        return { reconciledBlueprint };
    }
}
