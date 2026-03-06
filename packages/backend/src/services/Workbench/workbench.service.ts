import { Injectable } from '@nestjs/common';
import { Workbench } from '@vx-agent-editor/shared/domain';
import { CatalogueService as AGGEXCatalogueService } from '@vx-agent-builder/vx-aggex';

@Injectable()
export class WorkbenchService {
    async reconcileField(
        payload: Workbench.API.Field.Reconcile.Request
    ): Promise<Workbench.API.Field.Reconcile.Response> {
        const { fieldId, blueprintId, newValue } = payload;
        const reconcileFn = await AGGEXCatalogueService.getReconciler(blueprintId);

        if (!reconcileFn)
            throw new Error(`Reconciler for node ${blueprintId} not found`);

        const reconciledBlueprint = reconcileFn(fieldId, newValue);

        return { reconciledBlueprint };
    }
}
