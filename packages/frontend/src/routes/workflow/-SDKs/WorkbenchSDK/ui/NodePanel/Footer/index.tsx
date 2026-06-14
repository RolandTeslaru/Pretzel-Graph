import { StackSDK } from "@/routes/workflow/-SDKs/StackSDK";
import { Button } from "@pretzel-graph/standard-ui/foundations";
import { SystemIcons } from "@pretzel-graph/standard-ui/icons";
import IncomingPanel from "../IncomingPanel";
import OutgoingPanel from "../OutgoingPanel";
import type { Workflow } from "@pretzel-graph/shared/domain";

export const NodeSidebarFooter = ({ node }: { node: Workflow.Node }) => {

    const panelId = "nodeSidebar" as StackSDK.Panel.Id;

    const outgoingCompanionId = "outgoing" as StackSDK.Companion.Id;
    const incomingCompanionId = "incoming" as StackSDK.Companion.Id;

    const [isInputsOpen, isOutputsOpen] = StackSDK.useStore(s => {
        return [
            StackSDK.selectors.doesEntryHaveCompanion(s, panelId, incomingCompanionId),
            StackSDK.selectors.doesEntryHaveCompanion(s, panelId, outgoingCompanionId)
        ]
    })

    const toggleInputs = () => {
        if (isInputsOpen) {
            StackSDK.actions.popCompanion(panelId, incomingCompanionId);
        } else {
            StackSDK.actions.pushCompanion(panelId, incomingCompanionId, "left", 250, (props) => (
                <StackSDK.CompanionTemplate enter="right" {...props} className='right-100 top-24 bottom-24 w-62.5'>
                    <IncomingPanel />
                </StackSDK.CompanionTemplate>
            ))
        }
    }

    const toggleOutputs = () => {
        if (isOutputsOpen) {
            StackSDK.actions.popCompanion(panelId, outgoingCompanionId);
        } else {
            StackSDK.actions.pushCompanion(panelId, outgoingCompanionId, "right", 250, (props) => (
                <StackSDK.CompanionTemplate enter="right" {...props} className='right-5 top-24 bottom-24 w-62.5'>
                    <OutgoingPanel />
                </StackSDK.CompanionTemplate>
            ))
        }
    }

    return (
        <div className='absolute z-10 bottom-2 left-2 flex flex-row justify-between w-[calc(100%-16px)]'>
            <Button variant={isInputsOpen ? "active" : "ghost"} size="sm" className="gap-2 rounded-full" onClick={toggleInputs}>
                <SystemIcons.LogIn/>
                <p className="text-xs h-auto my-auto mt-1.5">Incoming</p>
            </Button>

            <Button variant={isOutputsOpen ? "active" : "ghost"} size={"sm"} className="gap-2 rounded-full" onClick={toggleOutputs}>
                <p className="text-xs mt-0.5">Outgoing</p>
                <SystemIcons.LogOut />
            </Button>
        </div>
    )
}
