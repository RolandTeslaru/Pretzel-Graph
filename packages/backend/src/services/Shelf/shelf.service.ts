import { Injectable } from '@nestjs/common';
import { Shelf } from '@vx-agent-editor/shared/domain';
import * as indexJson from './node_index.json';
import { ALL_DRAWERS, SECTIONS } from '@vx-agent-editor/shared/constants/drawers';
import { CatalogueService as AGGEXCatalogueService } from '@vx-agent-builder/worker';
import { Blueprint } from '@vx-agent-editor/shared/domain/Foundations/Blueprint';

const INDEX = indexJson as Shelf.Index;

@Injectable()
export class ShelfService {
    getBlueprint(
        payload: Shelf.API.Blueprint.Get.Request
    ): { blueprint: Blueprint } {
        const { blueprintId } = payload;
        const blueprint = INDEX.blueprints[blueprintId];

        if (!blueprint)
            throw new Error(`Blueprint not found: ${blueprintId}`);

        return { blueprint };
    }


    getBatchBlueprints(
        payload: Shelf.API.Blueprint.GetBatch.Request
    ): { blueprints: Record<Blueprint.Id, Blueprint> } {
        const { blueprintIds } = payload;
        const blueprints: Record<Blueprint.Id, Blueprint> = {};

        blueprintIds.forEach(blueprintId => {
            const blueprint = INDEX.blueprints[blueprintId as Blueprint.Id];
            if (blueprint)
                blueprints[blueprintId as Blueprint.Id] = blueprint;
        });

        return { blueprints };
    }


    getAllInSection(
        payload: Shelf.API.Blueprint.GetAllInSection.Request
    ): { blueprints: Record<Blueprint.Id, Blueprint> } {
        const { section } = payload;
        // @ts-expect-error
        const drawerIds = SECTIONS[section] as Shelf.Drawer.Id[];
        const blueprints: Record<Blueprint.Id, Blueprint> = {};

        drawerIds.forEach(drawerId => {
            const drawer = ALL_DRAWERS[drawerId];
            if (!drawer)
                return;
            drawer.blueprintIds.forEach(blueprintId => {
                const blueprint = INDEX.blueprints[blueprintId as Blueprint.Id];
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
        const reconcileFn = await AGGEXCatalogueService.getReconciler(blueprint.id);

        if (!reconcileFn)
            throw new Error(`Reconciler for node ${blueprint.id} not found`);

        const reconciledBlueprint = reconcileFn(blueprint, fieldId, newValue);

        return { reconciledBlueprint };
    }
}
