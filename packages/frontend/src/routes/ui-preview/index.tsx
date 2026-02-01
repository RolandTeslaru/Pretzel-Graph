import { createFileRoute } from '@tanstack/react-router'
import UIPreview from './-components/uiPreview'

export const Route = createFileRoute('/ui-preview/')({
    component: Index,
})

function Index() {
    return (
        <UIPreview/>
    )
}
