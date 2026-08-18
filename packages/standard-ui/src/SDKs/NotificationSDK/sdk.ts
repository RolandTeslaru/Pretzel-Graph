import { create, } from "zustand"
import { immer } from "zustand/middleware/immer"
import UILayer from "./components/uiLayer";
import { toast } from 'sonner';
import { SDK } from "../SDKManager";
import { BaseSDK } from "../Base";

@SDK("Notification")
class NotificationSDKImpl extends BaseSDK<NotificationSDK.State>{

    constructor() {super()}

    public readonly useStore: BaseSDK.Store<NotificationSDK.State> = create(
        immer<NotificationSDK.State>(() => ({
        }))
    )
    
    public readonly UIOverlay = UILayer
    
    public readonly toast = toast

}

export const NotificationSDK = SDK.get<NotificationSDKImpl>("Notification")


export namespace NotificationSDK {
    export type State = {

    }
}

