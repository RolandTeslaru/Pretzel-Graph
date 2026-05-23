import { type DrawerSDKImpl } from "./sdk"

export function createDrawerSDKActions(sdk: DrawerSDKImpl) {
    const setState = sdk.useStore.setState;
    return {
        open: () => setState(s => { s.isOpen = true }),
        close: () => setState(s => { s.isOpen = false }),
        toggle: () => setState(s => { s.isOpen = !s.isOpen }),
    } satisfies _DrawerSDKActions_
}

export type _DrawerSDKActions_ = {
    open: () => void
    close: () => void
    toggle: () => void
}
