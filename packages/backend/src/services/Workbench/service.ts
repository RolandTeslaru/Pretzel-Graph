import { Router } from "express";
import { Service } from "../ServiceManager";
import { Workbench } from "@vx-agent-editor/shared/domain";
import { CatalogueService as AGGEXCatalogueService } from "@vx-agent-builder/vx-aggex"


@Service("Workbench")
export class WorkbenchServiceImpl {
    constructor() { }

    public readonly ops = {
        field: {
            reconcile: async ({ fieldId, blueprintId, newValue }) => {
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
            reconcile: async (_req: Request, res: any) => {
                try {
                    const payload = Workbench.API.Field.Reconcile.Request.parse(_req.body)
                    const result = await this.ops.field.reconcile(payload)
                    res.json(result);
                } catch (error: any) {
                    res.status(500).json({ error: error.message })
                }
            }
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