import { Activity } from "@pretzel-graph/shared/domain";
import { api } from "@/SDKs/ApiInterceptorSDK";
import type { ActivitySDKImpl } from "./sdk";

export function _createActivityActions_(sdk: ActivitySDKImpl) {
    const setState = sdk.useStore.setState;

    return {
        /** The board's opening state. Events keep it current from here on. */
        bootstrap: async (): Promise<Activity> => {
            const activity = await Activity.API.bootstrap(api);

            setState((s) => {
                s.activity = activity;
            });

            return activity;
        },
    };
}

export type _ActivitySDKActions = ReturnType<typeof _createActivityActions_>;
