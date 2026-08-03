import { memo, useEffect } from "react";
import { Select } from "@pretzel-graph/standard-ui/foundations/select";
import { Button, Dialog } from "@pretzel-graph/standard-ui/foundations";
import { VaultSDK } from "@/SDKs/VaultSDK/sdk";
import { DialogSDK } from "@/SDKs/DialogSDK";
import { WorkbenchSDK } from "../../sdk";
import { CredentialForm } from "@/SDKs/VaultSDK/ui/CredentialForm";
import type { Vault, Workflow } from "@pretzel-graph/shared/domain";
import { SystemIcons } from "@pretzel-graph/standard-ui/icons";
import FloatContainer from "@/components/FloatContainer";

interface Props {
    credentialTemplate: Vault.Credential.Template;
    nodeId: Workflow.Node.Id;
    showTitle?: boolean;
}

export const CredentialPicker = memo(
    ({ credentialTemplate, nodeId, showTitle = true }: Props) => {
        const instances = VaultSDK.useStore((s) =>
            s.selectors.byTemplateId(s, credentialTemplate.id),
        );
        const [instanceId, setInstance, issue] = WorkbenchSDK.useCredential(
            nodeId,
            credentialTemplate.id,
        );

        useEffect(() => {
            if (instances.length === 0) {
                VaultSDK.actions.refreshAll().catch(() => { });
            }
        }, []);

        const openAddDialog = () => {
            const dialogId = `add-credentialTemplate-${credentialTemplate.id}`;
            DialogSDK.actions.push(dialogId, (props) => (
                <DialogSDK.Template {...props}>
                    <Dialog.Title className="text-sm font-semibold hidden">
                        Add Credential
                    </Dialog.Title>
                    <Dialog.Description className="text-xs text-muted-foreground hidden">
                        Add a new credential for this node
                    </Dialog.Description>
                    <CredentialForm
                        credentialTemplate={credentialTemplate}
                        onCreated={(instanceId) => {
                            setInstance(instanceId);
                            DialogSDK.actions.pop(dialogId);
                        }}
                    />
                </DialogSDK.Template>
            ));
        };

        const openEditDialog = (editInstanceId: Vault.Credential.Instance.Id) => {
            const dialogId = `edit-credentialInstance-${editInstanceId}`;
            DialogSDK.actions.push(dialogId, (props) => (
                <DialogSDK.Template {...props}>
                    <Dialog.Title className="text-sm font-semibold hidden">
                        Edit Credential
                    </Dialog.Title>
                    <Dialog.Description className="text-xs text-muted-foreground hidden">
                        Edit this credential
                    </Dialog.Description>
                    <CredentialForm
                        credentialTemplate={credentialTemplate}
                        updateProps={{
                            instanceId: editInstanceId,
                            onUpdateComplete: () => DialogSDK.actions.pop(dialogId),
                            onRemoved: () => {
                                setInstance(null);
                                DialogSDK.actions.pop(dialogId);
                            },
                        }}
                    />
                </DialogSDK.Template>
            ));
        };

        return (
            <div className="flex flex-col gap-1 w-full">
                {showTitle && (
                    <span className="text-xs font-medium text-muted-foreground">
                        {credentialTemplate.displayName}
                    </span>
                )}
                <div className="flex gap-1.5">
                    <Select.Root
                        value={instanceId ?? ""}
                        onValueChange={(val) =>
                            setInstance(val as Vault.Credential.Instance.Id)
                        }
                    >
                        <Select.Trigger
                            className={`flex-1 text-xs h-8${issue ? " border-2 border-destructive animate-border-ping focus-visible:ring-destructive/50" : ""}`}
                        >
                            <Select.Value placeholder="Select credential…" />
                        </Select.Trigger>
                        <Select.Content>
                            {instances.length === 0 ? (
                                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                    No credentials yet
                                </div>
                            ) : (
                                instances.map((c) => (
                                    <Select.Item key={c.id} value={c.id} className="text-xs">
                                        {c.name}
                                    </Select.Item>
                                ))
                            )}
                        </Select.Content>
                    </Select.Root>
                    {instanceId ? (
                        <FloatContainer>
                            <Button
                                variant="ghost"
                                size="icon-xxs"
                                className="my-auto"
                                onClick={() => instanceId && openEditDialog(instanceId)}
                            >
                                <SystemIcons.SquarePen/>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-xxs"
                                className="text-destructive my-auto"
                                onClick={() => setInstance(null)}
                            >
                                <SystemIcons.Trash />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-xxs"
                                className="my-auto"
                                onClick={openAddDialog}
                            >
                                <SystemIcons.Plus />
                            </Button>
                        </FloatContainer>
                    ) : (
                        <Button variant="outline" size="sm" onClick={openAddDialog}>
                            <SystemIcons.Plus /> Add
                        </Button>
                    )}
                </div>
            </div>
        );
    },
);

CredentialPicker.displayName = "CredentialPicker";
