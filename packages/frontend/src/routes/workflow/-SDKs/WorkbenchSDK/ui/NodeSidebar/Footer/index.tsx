import { StackSDK } from "@/routes/workflow/-SDKs/StackSDK";
import { Button } from "@pretzel-graph/standard-ui/foundations";
import { SystemIcons } from "@pretzel-graph/standard-ui/icons";
import IncomingPanel from "../IncomingPanel";

export const NodeSidebarFooter = () => {

    const [isInputsOpen, isOutputsOpen] = StackSDK.useStore(s => {
        return [
            StackSDK.selectors.doesEntryHaveCompanion(s, "nodeSidebar", "incoming"), 
            StackSDK.selectors.doesEntryHaveCompanion(s, "nodeSidebar", "outgoing")
        ]
    })

    const toggleInputs = () => {
        if (isInputsOpen) {
            StackSDK.actions.popCompanion("nodeSidebar", "incoming");
        } else {
            StackSDK.actions.pushCompanion("nodeSidebar", "incoming", (props) => (
                <StackSDK.CompanionTemplate enter="right" {...props} className='right-100 top-24 bottom-24 w-62.5'>
                    <IncomingPanel />
                </StackSDK.CompanionTemplate>
            ))
        }
    }

    const toggleOutputs = () => {
        if (isOutputsOpen) {
            StackSDK.actions.popCompanion("nodeSidebar", "outgoing");
        } else {
            StackSDK.actions.pushCompanion("nodeSidebar", "outgoing", (props) => (
                <StackSDK.CompanionTemplate {...props} className='left-100 top-24 bottom-24 w-62.5'>
                    <div className="p-2 h-full">
                        <div className='bg-card border border-border rounded-full p-1 flex flex-row gap-2 shadow-md shadow-black/10'>
                            <SystemIcons.LogOut size={20}/>
                            <p className='h-auto my-auto text-sm'>Outgoing Data</p>
                        </div>
                    </div>
                </StackSDK.CompanionTemplate>
            ))
        }
    }

    return (
        <div className='absolute z-10 bottom-2 left-2 flex flex-row justify-between bg-card w-[calc(100%-16px)] p-1 rounded-full border border-border shadow-md shadow-black/10'>
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
