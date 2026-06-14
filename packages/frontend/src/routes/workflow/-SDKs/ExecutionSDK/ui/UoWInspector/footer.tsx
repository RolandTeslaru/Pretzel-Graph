import { StackSDK } from "../../../StackSDK"
import { Button } from "@pretzel-graph/standard-ui/foundations"
import { SystemIcons } from "@pretzel-graph/standard-ui/icons"
import IncomingPanel from "./incoming-panel"
import OutgoingPanel from "./outgoing-panel"

const PANEL_ID            = "uowInspector" as StackSDK.Panel.Id
const INCOMING_COMPANION  = "uow-incoming" as StackSDK.Companion.Id
const OUTGOING_COMPANION  = "uow-outgoing" as StackSDK.Companion.Id

export const UoWInspectorFooter = () => {

    const [isIncomingOpen, isOutgoingOpen] = StackSDK.useStore(s => [
        StackSDK.selectors.doesEntryHaveCompanion(s, PANEL_ID, INCOMING_COMPANION),
        StackSDK.selectors.doesEntryHaveCompanion(s, PANEL_ID, OUTGOING_COMPANION),
    ])

    const toggleIncoming = () => {
        if (isIncomingOpen) {
            StackSDK.actions.popCompanion(PANEL_ID, INCOMING_COMPANION)
        } else {
            StackSDK.actions.pushCompanion(PANEL_ID, INCOMING_COMPANION, "left", 250, (props) => (
                <StackSDK.CompanionTemplate enter="right" {...props} className='right-100 top-24 bottom-24 w-62.5'>
                    <IncomingPanel />
                </StackSDK.CompanionTemplate>
            ))
        }
    }

    const toggleOutgoing = () => {
        if (isOutgoingOpen) {
            StackSDK.actions.popCompanion(PANEL_ID, OUTGOING_COMPANION)
        } else {
            StackSDK.actions.pushCompanion(PANEL_ID, OUTGOING_COMPANION, "right", 250, (props) => (
                <StackSDK.CompanionTemplate enter="right" {...props} className='right-5 top-24 bottom-24 w-62.5'>
                    <OutgoingPanel />
                </StackSDK.CompanionTemplate>
            ))
        }
    }

    return (
        <div className='absolute z-10 bottom-2 left-2 flex flex-row justify-between  w-[calc(100%-16px)] '>
            <Button variant={isIncomingOpen ? "active" : "ghost"} size="sm" className="gap-2 rounded-full" onClick={toggleIncoming}>
                <SystemIcons.LogIn />
                <p className="text-xs h-auto my-auto mt-1.5">Incoming</p>
            </Button>

            <Button variant={isOutgoingOpen ? "active" : "ghost"} size="sm" className="gap-2 rounded-full" onClick={toggleOutgoing}>
                <p className="text-xs mt-0.5">Outgoing</p>
                <SystemIcons.LogOut />
            </Button>
        </div>
    )
}
