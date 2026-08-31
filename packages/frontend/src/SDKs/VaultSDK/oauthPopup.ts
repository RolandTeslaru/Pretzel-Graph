import { Vault } from "@pretzel-graph/shared/domain"

const CLOSE_GRACE_MS = 600

// Opened synchronously from the click so the browser treats it as user-initiated;
// the authorize URL is set once the backend has minted it.
export function openOAuthPopup(): Window | null {
    return window.open('about:blank', 'pretzel-oauth', 'popup,width=520,height=680')
}

// Resolves with the instance the callback page wrote, rejects when it reports an error
// or the user closes the window.
export function awaitOAuthConnection(popup: Window | null, authorizeUrl: string): Promise<Vault.Credential.Instance.Id> {
    if (!popup)
        return Promise.reject(new Error('The browser blocked the sign-in window. Allow popups for this site and try again.'))

    popup.location.href = authorizeUrl

    return new Promise((resolve, reject) => {
        let settled = false

        const settle = (fn: () => void) => {
            if (settled)
                return

            settled = true
            window.removeEventListener('message', onMessage)
            clearInterval(closeWatch)
            fn()
        }

        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin)
                return

            const parsed = Vault.OAuth.PopupMessage.safeParse(event.data)

            if (!parsed.success)
                return

            const { instanceId, error } = parsed.data

            settle(() => instanceId
                ? resolve(instanceId)
                : reject(new Error(error ?? 'Connection failed')))
        }

        // The page posts and then closes itself, so give a pending message a moment to land.
        const closeWatch = setInterval(() => {
            if (!popup.closed)
                return

            clearInterval(closeWatch)
            setTimeout(() => settle(() => reject(new Error('Connection cancelled'))), CLOSE_GRACE_MS)
        }, 400)

        window.addEventListener('message', onMessage)
    })
}
