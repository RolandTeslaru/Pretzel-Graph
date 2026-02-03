import { create, } from "zustand"
import { immer } from "zustand/middleware/immer"
import UILayer from "./components/uiLayer";
import { toast } from 'sonner';
import { SDK } from "@/SDKs/SDKManager";
import { BaseSDK } from "../Base";

@SDK("Notification")
class NotificationSDKImpl extends BaseSDK<NotificationSDK.State>{

    constructor() {super()}

    public storageName = null

    public readonly useStore: BaseSDK.Store<NotificationSDK.State> = create(
        immer<NotificationSDK.State>(() => ({
        }))
    )
    
    public readonly UIOverlay = UILayer
    
    public readonly actions = {
        success: (message: string) => toast.success(message),
        error: (message: string) => toast.error(message),
        info: (message: string) => toast.info(message),
        warning: (message: string) => toast.warning(message),
        toast: toast
    }

}

export const NotificationSDK = SDK.get<NotificationSDKImpl>("Notification")


export namespace NotificationSDK {
    export type State = {

    }
}

