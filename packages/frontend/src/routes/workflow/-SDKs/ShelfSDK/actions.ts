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
            setDataTypes: (...props: Parameters<ShelfSDK.Reducers["searchFilter"]["setDataTypes"]> extends [any, ...infer Rest] ? Rest : never) =>
                setState(s => { sdk.reducers.searchFilter.setDataTypes(s, ...props) }),
            toggleDataType: (...props: Parameters<ShelfSDK.Reducers["searchFilter"]["toggleDataType"]> extends [any, ...infer Rest] ? Rest : never) =>
                setState(s => { sdk.reducers.searchFilter.toggleDataType(s, ...props) }),
        },

        getReconciledBlueprint: async (blueprint, fieldId, newValue, fieldValues, { onApiFetch } = {}) => {
            const reconciledId = Foundations.Blueprint.createReconciledId(
                blueprint.id, blueprint.fields, fieldValues, { [fieldId]: newValue }
            );

            const cached = getState().reconciledBlueprintsCache[reconciledId];
            // if(cached)
            //     toast.success("Using cached reconciled blueprint");
            //  else
            //     toast.info("Reconciling blueprint...");
            if (cached) return cached;

            onApiFetch?.();

            const { reconciledBlueprint } = await Shelf.API.Blueprint.reconcile(api, {
                blueprint, fieldId, newValue
            });

            setState(s => { s.reconciledBlueprintsCache[reconciledId] = reconciledBlueprint });
            return reconciledBlueprint;
        }
    } satisfies _ShelfActions
}

export type _ShelfActions = {
    loadSection: (section: Shelf.Section) => Promise<boolean>;
    hydrateBlueprint: (blueprintId: Foundations.Blueprint.Id) => Promise<boolean>;
    drawer: {
        open: (drawerId: Shelf.Drawer.Id) => void;
        close: (drawerId: Shelf.Drawer.Id) => void;
        toggle: (drawerId: Shelf.Drawer.Id) => Promise<void>;
    };
    setSection: (section: Shelf.Section) => void;
    searchFilter: {
        setQuery: DropFirstArg<ShelfSDK.Reducers["searchFilter"]["setQuery"]>;
        setDataTypes: DropFirstArg<ShelfSDK.Reducers["searchFilter"]["setDataTypes"]>;
        toggleDataType: DropFirstArg<ShelfSDK.Reducers["searchFilter"]["toggleDataType"]>;
    };

    getReconciledBlueprint: (
        blueprint: Foundations.Blueprint,
        fieldId: Foundations.Field.Id,
        newValue: Foundations.Field.Value,
        fieldValues: Record<Foundations.Field.Id, Foundations.Field.Value>,
        callbacks?: { onApiFetch?: () => void }
    ) => Promise<Foundations.Blueprint>;
}