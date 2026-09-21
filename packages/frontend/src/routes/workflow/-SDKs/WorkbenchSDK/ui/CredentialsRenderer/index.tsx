import type { Vault, Workflow } from "@pretzel-graph/shared/domain";
import { CredentialPicker } from "@/SDKs/VaultSDK/ui/CredentialPicker";
import { WorkbenchSDK } from "../../sdk";

interface Props {
    credentialTemplate: Vault.Credential.Template;
    nodeId: Workflow.Node.Id;
    showTitle?: boolean;
}

// The Vault's picker, bound to the credential a node has set for one template.
export const CredentialRenderer = ({ credentialTemplate, nodeId, showTitle }: Props) => {
    const [instanceId, setInstance, issue] = WorkbenchSDK.useCredential(nodeId, credentialTemplate.id);

    return (
        <CredentialPicker
            credentialTemplate={credentialTemplate}
            instanceId={instanceId}
            setInstance={setInstance}
            issue={Boolean(issue)}
            showTitle={showTitle}
        />
    );
};
