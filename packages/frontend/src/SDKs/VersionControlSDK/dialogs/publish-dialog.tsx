import { useId, useState } from "react"
import { Dialog, Input, Label, Textarea } from "@pretzel-graph/standard-ui/foundations"
import { DialogSDK } from "@pretzel-graph/standard-ui/SDKs/DialogSDK"
import { VersionControlSDK } from "../sdk"
import { WorkbenchSDK } from "@/routes/workflow/-SDKs/WorkbenchSDK/sdk"
import { SystemIcons } from "@pretzel-graph/standard-ui/icons"
import { toast } from "sonner"
import PublicationHistory from "../ui/PublicationHistory"

const DIALOG_ID = "publish-workflow"

export function openPublishDialog() {
    DialogSDK.actions.push(DIALOG_ID, (props) => (
        <DialogSDK.SplitTemplate
            {...props}
            sidebarClassName="w-[300px]"
            contentClassName="p-0!"
            sidebarRenderer={() => (
                <DialogSDK.SplitTemplate.Header>
                    <DialogSDK.SplitTemplate.Icon icon={SystemIcons.History} />
                    <DialogSDK.SplitTemplate.Title>Version Control</DialogSDK.SplitTemplate.Title>
                    <DialogSDK.SplitTemplate.Description>
                        Creates a versioned snapshot of the current workflow state.
                    </DialogSDK.SplitTemplate.Description>
                </DialogSDK.SplitTemplate.Header>
            )}
        >
            <Dialog.Description className="hidden">
                Name this version so you can find it later.
            </Dialog.Description>
            <PublishDialogContent />
        </DialogSDK.SplitTemplate>
    ))
}

function PublishDialogContent() {
    const formId = useId()
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        const workflowId = WorkbenchSDK.document.workflowId
        const workflowData = WorkbenchSDK.document.data

        setIsLoading(true)
        try {
            await VersionControlSDK.actions.publish(workflowId, {
                name: name.trim(),
                description: description.trim() || null,
                workflowData,
            })
            DialogSDK.actions.pop(DIALOG_ID)
            toast.success("Workflow published")
        } catch {
            toast.error("Failed to publish workflow")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <Dialog.FloatingHeader title="Publish Workflow" icon={<SystemIcons.CloudUpload />} />

            <Dialog.MaskedScrollArea className="h-[500px] w-[450px]">
                <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="pub-name">Version name</Label>
                        <Input
                            id="pub-name"
                            placeholder="e.g. v1.0 — initial release"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="pub-description">
                            Description
                            <span className="ml-1 text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <Textarea
                            id="pub-description"
                            placeholder="What changed in this version?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="resize-none text-sm h-20"
                        />
                    </div>
                </form>

                <PublicationHistory className="w-full" hideHeader showCurrentChangesItem={false} />
            </Dialog.MaskedScrollArea>

            <Dialog.FloatingFooter>
                <Dialog.Cancel>Cancel</Dialog.Cancel>
                <Dialog.Action type="submit" form={formId} loading={isLoading} disabled={!name.trim()}>
                    {!isLoading && <SystemIcons.CloudUpload />}
                    Publish
                </Dialog.Action>
            </Dialog.FloatingFooter>
        </>
    )
}
