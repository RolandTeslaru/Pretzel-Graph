import { useState } from "react"
import { Button, Dialog, Input, Label, Spinner, Textarea } from "@pretzel-graph/standard-ui/foundations"
import { DialogSDK } from "@/SDKs/DialogSDK"
import { VersionControlSDK } from "../sdk"
import { WorkbenchSDK } from "@/routes/workflow/-SDKs/WorkbenchSDK/sdk"
import { SystemIcons } from "@pretzel-graph/standard-ui/icons"
import { toast } from "sonner"

const DIALOG_ID = "publish-workflow"

export function openPublishDialog() {
    DialogSDK.actions.push(DIALOG_ID, (props) => (
        <DialogSDK.Template {...props}>
            <PublishDialogContent />
        </DialogSDK.Template>
    ))
}

function PublishDialogContent() {
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        const workflowId = WorkbenchSDK.state.workflowId
        const workflowData = WorkbenchSDK.state.data

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
        <div className="p-3 flex flex-col gap-4 min-w-[380px]">
            <Dialog.Header className="my-1">
                <Dialog.Title className="flex items-center gap-2">
                    <SystemIcons.CloudUpload className="size-6" />
                    Publish Workflow
                </Dialog.Title>
                <Dialog.Description className="text-muted-foreground">
                    Create a versioned snapshot of the current workflow state.
                </Dialog.Description>
            </Dialog.Header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

                <Dialog.Footer>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => DialogSDK.actions.pop(DIALOG_ID)}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading || !name.trim()}>
                        {isLoading
                            ? <Spinner className="mr-2 h-4 w-4" />
                            : <SystemIcons.CloudUpload className="mr-2 size-4" />
                        }
                        Publish
                    </Button>
                </Dialog.Footer>
            </form>
        </div>
    )
}
