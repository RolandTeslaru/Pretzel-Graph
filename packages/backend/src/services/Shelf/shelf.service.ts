import { Injectable } from '@nestjs/common';
import { Foundations, Shelf } from '@vx-agent-editor/shared/domain';
import * as indexJson from './node_index.json';
import { ALL_DRAWERS, SECTIONS } from '@vx-agent-editor/shared/constants/drawers';

const INDEX = indexJson as Shelf.Index;

@Injectable()
export class ShelfService {
    getBlueprint(
        payload: Shelf.API.Blueprint.Get.Request
    ): { blueprint: Foundations.Blueprint } {
        const { blueprintId } = payload;
        const blueprint = INDEX.blueprints[blueprintId];

        if (!blueprint)
            throw new Error(`Blueprint not found: ${blueprintId}`);

        return { blueprint };
    }


    getBatchBlueprints(
        payload: Shelf.API.Blueprint.GetBatch.Request
    ): { blueprints: Record<Foundations.Blueprint.Id, Foundations.Blueprint> } {
        const { blueprintIds } = payload;
        const blueprints: Record<Foundations.Blueprint.Id, Foundations.Blueprint> = {};

        blueprintIds.forEach(blueprintId => {
            const blueprint = INDEX.blueprints[blueprintId as Foundations.Blueprint.Id];
            if (blueprint)
                blueprints[blueprintId as Foundations.Blueprint.Id] = blueprint;
        });

        return { blueprints };
    }


    getAllInSection(
        payload: Shelf.API.Blueprint.GetAllInSection.Request
    ): { blueprints: Record<Foundations.Blueprint.Id, Foundations.Blueprint> } {
        const { section } = payload;
        // @ts-expect-error
        const drawerIds = SECTIONS[section] as Shelf.Drawer.Id[];
        const blueprints: Record<Foundations.Blueprint.Id, Foundations.Blueprint> = {};

        drawerIds.forEach(drawerId => {
            const drawer = ALL_DRAWERS[drawerId];
            if (!drawer)
                return;
            drawer.blueprintIds.forEach(blueprintId => {
                const blueprint = INDEX.blueprints[blueprintId as Foundations.Blueprint.Id];
                if (blueprint)
                    blueprints[blueprintId as Foundations.Blueprint.Id] = blueprint;
            });
        });

        return { blueprints };
    }
}
