import { useState } from "react";
import { Button, Spinner } from "@pretzel-graph/standard-ui/foundations";
import { SystemIcons } from "@pretzel-graph/standard-ui/icons";
import Tipped from "@/components/Tipped";
import { WorkbenchSDK } from "@/routes/workflow/-SDKs/WorkbenchSDK/sdk";
import { VersionControlSDK } from "../sdk";
import { getPublicationLabel } from "../utils";

// Deploys the latest publication when off, undeploys when on.
export function DeploymentToggle({ size = "icon-sm", iconClassName }: { size?: "icon-xs" | "icon-sm"; iconClassName?: string }) {
    const workflowId = WorkbenchSDK.useDocument(d => d.workflowId);
    const [deployedPublication, [publicationsQuery]] = VersionControlSDK.useWith(
        (s) => s.selectors.getDeployed(s, workflowId),
        [VersionControlSDK.query.publications(workflowId), VersionControlSDK.query.deployment(workflowId)],
    );
    const latestPublication = publicationsQuery.data?.publications[0] ?? null;
    const [isPending, setIsPending] = useState(false);

    if (!latestPublication)
        return null;

    const handleDeploy = () => {
        VersionControlSDK.dialogs.openDeploy(latestPublication, deployedPublication, async () => {
            setIsPending(true);

            try {
                await VersionControlSDK.actions.deployWorkflow(workflowId);
            }
            finally {
                setIsPending(false);
            }
        });
    };

    const handleUndeploy = () => {
        if (!deployedPublication)
            return;

        VersionControlSDK.dialogs.openUndeploy(deployedPublication, () => VersionControlSDK.actions.undeploy(workflowId));
    };

    const label = deployedPublication
        ? `Deployed${getPublicationLabel(deployedPublication)}`
        : `Deploy ${getPublicationLabel(latestPublication)}`;

    return (
        <Tipped label={label}>
            <Button
                variant={deployedPublication ? "ghost-success" : "ghost-destructive"}
                disabled={isPending}
                onClick={deployedPublication ? handleUndeploy : handleDeploy}
            >
                {isPending
                    ? <Spinner className={iconClassName} />
                    : <>
                        
                        {deployedPublication ? "Undeploy" : "Deploy"} <SystemIcons.Power className={iconClassName} />
                    </> 
                    
                }
            </Button>
        </Tipped>
    );
}
