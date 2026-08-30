import { useState } from 'react'
import { Button, Input } from '@pretzel-graph/standard-ui/foundations'
import { Listing } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { DEPENDENCY_SELECTOR_DIALOG_ID, type DependencySelectorCallbacks } from './constants'

interface Props {
    onListingSelected: DependencySelectorCallbacks['onListingSelected']
    onListingPreview?: DependencySelectorCallbacks['onListingPreview']
}

export const ListingSelector = ({ onListingSelected, onListingPreview }: Props) => {
    const [value, setValue] = useState('')

    const listingId = Listing.Id.safeParse(value.trim()).data

    const handlePreview = () => {
        if (!listingId)
            return

        onListingPreview?.(listingId)
    }

    const handleAttach = () => {
        if (!listingId)
            return

        openAttachListingDialog(listingId, onListingSelected)
    }

    return (
        <div className='flex flex-col gap-2 pt-[40px] px-4'>
            <p className='text-xs text-muted-foreground'>Enter the public workflow listing id:</p>
            <div className='flex flex-row gap-2'>
                <Input
                    size="sm"
                    className='w-[300px]'
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={`${Listing.ID_PREFIX}-…`}
                    spellCheck={false}
                />
                {onListingPreview &&
                    <Button variant="input" disabled={!listingId} onClick={handlePreview}>
                        <SystemIcons.Graph/>
                        Preview
                    </Button>
                }
                <Button variant="input" disabled={!listingId} onClick={handleAttach}>
                    Attach
                </Button>
            </div>
        </div>
    )
}

const openAttachListingDialog = (listingId: Listing.Id, onListingSelected: DependencySelectorCallbacks['onListingSelected']) => {

    const dialogId = `attach-listing-${listingId}`

    DialogSDK.actions.push(dialogId, (props) => (
        <DialogSDK.AlertTemplate
            {...props}
            type='warning'
            onApprove={async () => {
                DialogSDK.actions.pop(dialogId)

                const success = await onListingSelected(listingId)

                if (success)
                    DialogSDK.actions.pop(DEPENDENCY_SELECTOR_DIALOG_ID)
            }}
            onCancel={() => DialogSDK.actions.pop(dialogId)}
        >
            <div className='font-semibold'>Attach public workflow?</div>
            <div className='text-sm text-muted-foreground mt-1'>
                Only embed publicly listed workflows you trust. A snapshot of the
                listed version is copied into this workflow and runs with it.
            </div>
        </DialogSDK.AlertTemplate>
    ))
}
