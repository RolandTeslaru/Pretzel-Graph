import { Router } from "express";
import { Foundations, Shelf } from "@vx-agent-editor/shared/domain";
import { Service } from "../ServiceManager";

// Import the pre-generated node index
// Note: Backend tsconfig needs "resolveJsonModule": true
// Note: Run `npm run generate-index` in vx-aggex to regenerate after adding nodes
import * as indexJson from "./node_index.json";
import { ALL_DRAWERS, SECTIONS } from "@vx-agent-editor/shared/constants/drawers";

const INDEX = indexJson as Shelf.Index

@Service("Shelf")
export class ShelfServiceImpl {

    constructor() { }

    /**
     * Operations - Business logic
     */
    public readonly ops: ShelfService.Ops = {
        blueprint: {
            get: ({ blueprintId }) => {
                const blueprint = INDEX.blueprints[blueprintId];

                if (!blueprint)
                    throw new Error(`Blueprint not found: ${blueprintId}`);

                return { blueprint }
            },
            getBatch: ({ blueprintIds }) => {
                const blueprints: Record<Foundations.Blueprint.Id, Foundations.Blueprint> = {}

                blueprintIds.forEach(blueprintId => {
                    const blueprint = INDEX.blueprints[blueprintId as Foundations.Blueprint.Id];
                    if (blueprint)
                        blueprints[blueprintId as Foundations.Blueprint.Id] = blueprint
                })

                return { blueprints };
            },
            getAllInSection: ({ section }) => {
                // TODO: FIX THIS
                // @ts-expect-error
                const drawerIds = SECTIONS[section] as Shelf.Drawer.Id[];
                const blueprints: Record<Foundations.Blueprint.Id, Foundations.Blueprint> = {}

                drawerIds.forEach(drawerId => {
                    const drawer = ALL_DRAWERS[drawerId];
                    if (!drawer)
                        return
                    drawer.blueprintIds.forEach(blueprintId => {
                        const blueprint = INDEX.blueprints[blueprintId as Foundations.Blueprint.Id];
                        if (blueprint)
                            blueprints[blueprintId as Foundations.Blueprint.Id] = blueprint
                    })
                })

                return { blueprints };
            }
        }
    };

    /**
     * Controllers - Request handlers (no auth needed for shelf data)
     */
    public readonly controller = {
        blueprint: {
            get: (_req: Request, res: any) => {
                try {
                    const { blueprintId } = Shelf.API.Blueprint.Get.Request.parse(_req.body);
                    const result = this.ops.blueprint.get({ blueprintId });
                    res.json(result);
                } catch (error: any) {
                    res.status(500).json({ error: error.message });
                }
            },
            getBatch: (_req: Request, res: any) => {
                try {
                    const { blueprintIds } = Shelf.API.Blueprint.GetBatch.Request.parse(_req.body);
                    const result = this.ops.blueprint.getBatch({ blueprintIds });
                    res.json(result);
                } catch (error: any) {
                    res.status(500).json({ error: error.message });
                }
            },
            getAllInSection: (_req: Request, res: any) => {
                try {
                    const { section } = Shelf.API.Blueprint.GetAllInSection.Request.parse(_req.body);
                    const result = this.ops.blueprint.getAllInSection({ section });
                    res.json(result);
                } catch (error: any) {
                    res.status(500).json({ error: error.message });
                }
            }
        },
    };

    /**
     * Routes
     */
    public readonly routes = Router()
        .post("/blueprint/get", this.controller.blueprint.get)
        .post("/blueprint/getBatch", this.controller.blueprint.getBatch)
        .post("/blueprint/getAllInSection", this.controller.blueprint.getAllInSection)
}

export const ShelfService = Service.get<ShelfServiceImpl>("Shelf");

export namespace ShelfService {
    export type Ops = {
        blueprint: {
            get: (req: Shelf.API.Blueprint.Get.Request) => Shelf.API.Blueprint.Get.Response
            getBatch: (req: Shelf.API.Blueprint.GetBatch.Request) => Shelf.API.Blueprint.GetBatch.Response
            getAllInSection: (req: Shelf.API.Blueprint.GetAllInSection.Request) => Shelf.API.Blueprint.GetAllInSection.Response
        }
    };

}
