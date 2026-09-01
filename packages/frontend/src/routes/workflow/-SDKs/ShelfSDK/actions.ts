import type { ShelfSDKImpl, ShelfSDK } from "./sdk";
import type { DropFirstArg } from "@/SDKs/types";
import { Foundations, Shelf } from "@pretzel-graph/shared/domain";
import { toast } from "sonner";
import { api } from "@/SDKs/ApiInterceptorSDK";

export function _createShelfActions_(sdk: ShelfSDKImpl) {
    const setState = sdk.useStore.setState;
    const getState = sdk.useStore.getState;

    return {
        loadSection: async (section) => {
            // Simple retry mechanism
            const MAX_RETRIES = 5;
            for (let i = 0; i < MAX_RETRIES; i++) {
                try {
                    const { blueprints } = await Shelf.API.Blueprint.getAllInSection(api, { section });
                    console.log("Loaded Blueprints", blueprints);
                    setState(s => {
                        s.blueprints = { ...s.blueprints, ...blueprints };
                        s.loadedSections.add(section);
                    });
                    return true;
                } catch (error) {
                    console.warn(`Attempt ${i + 1} failed, retrying in 1s...`);
                    if (i === MAX_RETRIES - 1) {
                        toast.error(`Could not fetch shelf section ${section}. Server might be restarting.`);
                        return false;
                    }
                    await new Promise(res => setTimeout(res, 1000)); // Wait 1s
                }
            }
            return false;
        },
        upsertBlueprint: (blueprint: Foundations.Blueprint) => {
            setState(s => {
                s.blueprints[blueprint.id] = blueprint;
            });
        },
        upsertBlueprints: (blueprints: Record<Foundations.Blueprint.Id, Foundations.Blueprint>) => {
            setState(s => {
                s.blueprints = { ...s.blueprints, ...blueprints };
            });
        },
        hydrateBatch: async (blueprintIds) => {
            const have = getState().blueprints;
            const missing = [...new Set(blueprintIds)].filter(id => !have[id]);
            
            if (missing.length === 0) 
                return true;
            
            try {
                const { blueprints } = await Shelf.API.Blueprint.getBatch(api, { blueprintIds: missing });
            
                setState(s => { 
                    s.blueprints = { ...s.blueprints, ...blueprints };
                });
            
                return true;
            } catch (error) {
                console.error(`Could not hydrate blueprint batch`, error);
                return false;
            }
        },
        hydrateBlueprint: async (blueprintId) => {
            try {
                const { blueprint } = await Shelf.API.Blueprint.get(api, { blueprintId });
                setState(s => {
                    s.blueprints[blueprintId] = blueprint;
                });
                return true;
            } catch (error) {
                console.error(`Could not hydrate blueprint ${blueprintId}`, error);
                return false;
            }
        },

        drawer: {
            open: (drawerId: Shelf.Drawer.Id) => {
                setState(s => { sdk.reducers.drawer.open(s, drawerId) });
            },
            close: (drawerId: Shelf.Drawer.Id) => {
                setState(s => { sdk.reducers.drawer.close(s, drawerId) });
            },
            toggle: async (drawerId: Shelf.Drawer.Id) => {
                const state = getState();
                const isOpen = state.openedDrawers.has(drawerId);

                if (isOpen) {
                    // Closing - just update UI
                    setState(s => { sdk.reducers.drawer.close(s, drawerId) });
                } else {
                    // Opening - update UI immediately
                    setState(s => { sdk.reducers.drawer.open(s, drawerId) });
                }
            },
        },

        setSection: (section: Shelf.Section) => setState(s => {
            sdk.reducers.setSection(s, section)
        }),

        searchFilter: {
            setQuery: (...props: Parameters<ShelfSDK.Reducers["searchFilter"]["setQuery"]> extends [any, ...infer Rest] ? Rest : never) =>
                setState(s => { sdk.reducers.searchFilter.setQuery(s, ...props) }),
            setVariants: (...props: Parameters<ShelfSDK.Reducers["searchFilter"]["setVariants"]> extends [any, ...infer Rest] ? Rest : never) =>
                setState(s => { sdk.reducers.searchFilter.setVariants(s, ...props) }),
            toggleVariant: (...props: Parameters<ShelfSDK.Reducers["searchFilter"]["toggleVariant"]> extends [any, ...infer Rest] ? Rest : never) =>
                setState(s => { sdk.reducers.searchFilter.toggleVariant(s, ...props) }),
        },

        getDerivedBlueprint: async (blueprint, fieldValues, { onApiFetch } = {}) => {
            const derivedId = Foundations.Blueprint.deriveId(blueprint, fieldValues);

            const cached = getState().derivedBlueprintsCache[derivedId];
            if (cached) return cached;

            onApiFetch?.();

            const { derivedBlueprint } = await Shelf.API.Blueprint.derive(api, {
                blueprintId: blueprint.id, fieldValues
            });

            setState(s => {
                s.derivedBlueprintsCache[derivedId] = derivedBlueprint;
                // Also key it in the main blueprint map — derive-on-read (getInputs/getFields/…)
                // resolves a node's blueprint by `reconciledBlueprintId` out of `blueprints`.
                s.blueprints[derivedId] = derivedBlueprint;
            });
            return derivedBlueprint;
        }
    } satisfies _ShelfActions
}

export type _ShelfActions = {
    loadSection: (section: Shelf.Section) => Promise<boolean>;
    hydrateBatch: (blueprintIds: Foundations.Blueprint.Id[]) => Promise<boolean>;
    hydrateBlueprint: (blueprintId: Foundations.Blueprint.Id) => Promise<boolean>;
    drawer: {
        open: (drawerId: Shelf.Drawer.Id) => void;
        close: (drawerId: Shelf.Drawer.Id) => void;
        toggle: (drawerId: Shelf.Drawer.Id) => Promise<void>;
    };
    setSection: (section: Shelf.Section) => void;
    searchFilter: {
        setQuery:       DropFirstArg<ShelfSDK.Reducers["searchFilter"]["setQuery"]>;
        setVariants:   DropFirstArg<ShelfSDK.Reducers["searchFilter"]["setVariants"]>;
        toggleVariant: DropFirstArg<ShelfSDK.Reducers["searchFilter"]["toggleVariant"]>;
    };

    getDerivedBlueprint: (
        blueprint: Foundations.Blueprint,
        fieldValues: Record<Foundations.Field.Id, Foundations.Field.Value>,
        callbacks?: { onApiFetch?: () => void }
    ) => Promise<Foundations.Blueprint>;

    upsertBlueprint: (blueprint: Foundations.Blueprint) => void;
    upsertBlueprints: (blueprints: Record<Foundations.Blueprint.Id, Foundations.Blueprint>) => void;
}
