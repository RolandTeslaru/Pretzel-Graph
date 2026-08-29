import { immer } from "zustand/middleware/immer";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { BaseSDK } from "@pretzel-graph/standard-ui/SDKs/Base";
import { SDK } from "@pretzel-graph/standard-ui/SDKs/SDKManager";
import { Activity } from "@pretzel-graph/shared/domain";
import { QuerySDK } from "@pretzel-graph/standard-ui/SDKs/QuerySDK/sdk";
import { RealtimeSDK } from "@/SDKs/Realtime/sdk";
import { _createActivityActions_, type _ActivitySDKActions } from "./actions";

// Events keep the board current between refetches, so this only has to be
// short enough to pick up a workflow that became a new column.
const ACTIVITY_STALE_TIME = 60_000

@SDK("Activity")
export class ActivitySDKImpl extends BaseSDK<ActivitySDK.State> {

    constructor() {
        super()

        // One channel for the workspace, so it is held for the session rather
        // than resubscribed as the board changes.
        this.runtime.unsubscribeFromActivityChannel = RealtimeSDK.subscribeToChannel(
            Activity.Event.getChannel(),
            this.handleOnEvent
        )
    }

    public readonly runtime = {
        unsubscribeFromActivityChannel: null as (() => void) | null
    }

    public readonly useStore: BaseSDK.Store<ActivitySDK.State> = createWithEqualityFn(
        immer<ActivitySDK.State>(() => ({
            activity: { workflows: {} },
        })),
        shallow
    )

    public readonly actions: ActivitySDK.Actions = _createActivityActions_(this)

    /** One descriptor, so every caller names the same cache entry. */
    private readonly activityQuery = {
        queryKey:  ['activity', 'bootstrap'] as const,
        queryFn:   () => this.actions.bootstrap(),
        staleTime: ACTIVITY_STALE_TIME,
    }

    /** Seeds the store; the channel subscription keeps it live from there. */
    public useActivityBootstrapQuery = () => QuerySDK.useQuery<Activity, Error>(
        this.activityQuery.queryKey,
        this.activityQuery.queryFn,
        { staleTime: this.activityQuery.staleTime },
    )

    /** The same query for route loaders, which run before anything renders. */
    public fetchActivityBootstrap = () => QuerySDK.client.fetchQuery(this.activityQuery)

    public readonly selectors: ActivitySDK.Selectors = {}

    /**
     * Every member carries the whole row, so one upsert serves all of them —
     * a run that started is a new entry, and one that ended is the same entry
     * with a terminal status.
     */
    public handleOnEvent = (event: Activity.Event) => {
        this.useStore.setState((s) => {
            const column = s.activity.workflows[event.execution.workflow_id];

            // A workflow the board is not showing; the next bootstrap picks it up.
            if (!column)
                return;

            const index = column.executions.findIndex(
                (execution) => execution.id === event.execution.id
            );

            if (index === -1) {
                column.executions.unshift(event.execution);

                return;
            }

            column.executions[index] = event.execution;
        });
    }
}

export const ActivitySDK = SDK.get<ActivitySDKImpl>("Activity")

export namespace ActivitySDK {

    export type State = {
        activity: Activity;
    }

    export type Actions = _ActivitySDKActions
    export type Selectors = {}
}
