import { Router } from "express";
import { Service } from "../ServiceManager";
import { Workbench } from "@vx-agent-editor/shared/domain";
import { CatalogueService as AGGEXCatalogueService } from "@vx-agent-builder/vx-aggex"
import { withAuth } from "@/handlers/controller";


@Service("Workbench")
export class WorkbenchServiceImpl {
    constructor() { }

    public readonly ops = {
        field: {
            reconcile: async (payload) => {
                const { fieldId, blueprintId, newValue } = payload;
                
                const reconcileFn = await AGGEXCatalogueService.getReconciler(blueprintId);

                if (!reconcileFn)
                    throw new Error(`Reconciler for node ${blueprintId} not found`);

                const reconciledBlueprint = reconcileFn(fieldId, newValue);

                return { reconciledBlueprint };
            }
        }
    } satisfies WorkbenchService.Ops

    public readonly controller = {
        field: {
            reconcile: withAuth(async (_, req) => {
                const payload = Workbench.API.Field.Reconcile.Request.parse(req.body);
                return await this.ops.field.reconcile(payload);
            })
        }
    }

    public readonly routes = Router()
        .post("/field/reconcile", this.controller.field.reconcile)
}

export const WorkbenchService = Service.get<WorkbenchServiceImpl>("Workbench");

export namespace WorkbenchService {
    export type Ops = {
        field: {
            reconcile: (payload: Workbench.API.Field.Reconcile.Request) => Promise<Workbench.API.Field.Reconcile.Response>
        }
    }
}