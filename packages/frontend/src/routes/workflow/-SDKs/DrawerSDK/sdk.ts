import { BaseSDK } from "@/SDKs/Base";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { SDK } from "@/SDKs/SDKManager";
import { createDrawerSDKActions, type _DrawerSDKActions_ } from "./actions";

@SDK("Drawer")
export class DrawerSDKImpl extends BaseSDK<DrawerSDK.State> {

    constructor() { super() }

    public readonly useStore: BaseSDK.Store<DrawerSDK.State> = create(
        immer<DrawerSDK.State>(() => ({
            isOpen: false,
        }))
    )

    public readonly actions: DrawerSDK.Actions = createDrawerSDKActions(this);

}

export const DrawerSDK = SDK.get<DrawerSDKImpl>("Drawer")

export namespace DrawerSDK {
    export type State = {
        isOpen: boolean
    }

    export type Actions = _DrawerSDKActions_
}
