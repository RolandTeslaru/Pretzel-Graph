import { Release } from '@pretzel-graph/shared/domain'
import { NotificationSDK } from '@pretzel-graph/standard-ui/SDKs/NotificationSDK'
import { api } from '@/SDKs/ApiInterceptorSDK/sdk'

const DISMISSED_VERSION_KEY = 'pretzel.update.dismissed'

const UPDATING_URL = 'https://github.com/RolandTeslaru/Pretzel-Graph#updating'

// Offers a newer version once per version, until it is dismissed.
export async function showUpdateNotice() {
    let update: Release.API.Update.Response

    try {
        update = await Release.API.getUpdate(api)
    }
    catch {
        // Only admins may ask; everyone else simply sees no notice.
        return
    }

    const version = update.available

    if (!version)
        return

    if (localStorage.getItem(DISMISSED_VERSION_KEY) === version)
        return

    const dismiss = () => localStorage.setItem(DISMISSED_VERSION_KEY, version)

    NotificationSDK.toast(`PretzelGraph ${version} is available`, {
        id:          'update-available',
        description: `This installation runs ${update.current}.`,
        duration:    Infinity,
        closeButton: true,
        onDismiss:   dismiss,
        action: {
            label:   'How to update',
            onClick: () => {
                dismiss()

                window.open(UPDATING_URL, '_blank', 'noopener')
            },
        },
    })
}
