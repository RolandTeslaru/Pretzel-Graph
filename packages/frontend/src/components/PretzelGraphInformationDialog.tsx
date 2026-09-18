import pretzelLogo from '@/assets/pretzel-logo.png'
import { Button, Dialog } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'

const DIALOG_ID = 'pretzelgraph-information'
const REPOSITORY_URL = 'https://github.com/RolandTeslaru/Pretzel-Graph'

export function openPretzelGraphInformationDialog() {
    DialogSDK.actions.push(DIALOG_ID, props => (
        <DialogSDK.Template {...props} className="w-[calc(100vw-2rem)] max-w-[440px]">
            <div className="flex flex-col gap-5 p-3">
                <Dialog.Header>
                    <div className="flex items-center gap-3">
                        <img src={pretzelLogo} alt="" width={42} height={42} />
                        <div>
                            <Dialog.Title>PretzelGraph</Dialog.Title>
                            <Dialog.Description>Visual agent runtime</Dialog.Description>
                        </div>
                    </div>
                </Dialog.Header>

                <div className="flex items-center justify-between gap-4 py-3">
                    <p className="text-sm font-medium">Current release</p>
                    <span className="shrink-0 font-mono text-sm">v{__PRETZELGRAPH_VERSION__}</span>
                </div>

                <Dialog.Footer>
                    <Button asChild variant="ghost">
                        <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
                            Source
                            <SystemIcons.ExternalLink />
                        </a>
                    </Button>
                    <Button type="button" onClick={() => DialogSDK.actions.pop(DIALOG_ID)}>
                        Close
                    </Button>
                </Dialog.Footer>
            </div>
        </DialogSDK.Template>
    ))
}
