import { SystemIcons } from "@pretzel-graph/standard-ui/icons";
import { LazyIcon } from "@pretzel-graph/standard-ui/icons/LazyIcon";
import type { Workflow } from "@pretzel-graph/shared/domain";
import { ExecutionSDK } from "../../sdk";
import { WorkbenchSDK } from "../../../WorkbenchSDK/sdk";
import Tipped from "@/components/Tipped";
import {
  handlePause,
  handleResume,
  handleRun,
  handleRunWithIgniteableNode,
  handleSuspend,
  handleTerminate,
  handleClear,
} from "./utils";
import { AnimatePresence, motion } from "motion/react";
import { ControlButton } from "./control-button";
import {
  Button,
  DropdownMenu,
  Popover,
  Spinner,
  Switch,
} from "@pretzel-graph/standard-ui/foundations";
import ExecutionHistoryPanel from "../ExecutionHistoryPanel";
import { ButtonGroup } from "@pretzel-graph/standard-ui/foundations/button-group";

const spring = { type: "spring", stiffness: 500, damping: 28 } as const;

interface Props {
  canRun: boolean;
}

const ExecutionControls = ({ canRun }: Props) => {
  const [currentExecution, awaitedConfirmation, igniterAttributes] =
    ExecutionSDK.useStore((s) => [
      s.currentExecution,
      s.awaitedConfirmation,
      s.igniterAttributes,
    ]);

  const igniteableNodeIds = WorkbenchSDK.useStore((s) =>
    s.selectors.node.getIgniteableNodes(s),
  );

  let status = "idle";
  if (currentExecution) {
    const executionStatus = currentExecution.status;
    if (
      executionStatus === "failed" ||
      executionStatus === "completed" ||
      executionStatus === "terminated"
    ) {
      status = executionStatus;
    } else if (executionStatus === "paused") {
      status = "paused";
    } else if (executionStatus === "running") {
      status = "running";
    }
  }

  return (
    <>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={status}
          layout
          className="flex gap-1 items-center"
          initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
          transition={spring}
        >
          {status === "idle" ||
            status === "failed" ||
            status === "completed" ? (
            <>
              <ButtonGroup>
                <Button
                  disabled={!canRun || awaitedConfirmation.has("started")}
                  variant="success"
                  className="my-auto"
                  onClick={handleRun}
                >
                  {awaitedConfirmation.has("started") ? (
                    <Spinner />
                  ) : (
                    <>
                      <SystemIcons.Play className="mr-auto" />
                      Run
                    </>
                  )}
                </Button>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button
                      variant="success"
                      size="icon-sm"
                      aria-label="More Options"
                      disabled={!canRun || awaitedConfirmation.has("started")}
                      className="w-6!"
                    >
                      <SystemIcons.ChevronUp />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={8}
                    className="min-w-[150px]!"
                  >
                    <DropdownMenu.Group>
                      <DropdownMenu.Item onSelect={handleRun}>
                        <SystemIcons.Play className="mr-2" />
                        Run
                      </DropdownMenu.Item>
                      {igniteableNodeIds.map((nodeId) => (
                        <IgniterRunItem key={nodeId} nodeId={nodeId} />
                      ))}
                    </DropdownMenu.Group>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Group>
                      <DropdownMenu.StaticItem>
                        <SystemIcons.Film className="mr-2" />
                        Record
                        <Switch
                          size={"md"}
                          className="ml-auto"
                          checked={igniterAttributes.record}
                          onCheckedChange={(checked) => {
                            ExecutionSDK.actions.igniter.setShouldRecord(
                              checked,
                            );
                          }}
                        />
                      </DropdownMenu.StaticItem>
                      <DropdownMenu.StaticItem>
                        <SystemIcons.SearchCode className="mr-2" />
                        Debug
                        <Switch
                          size={"md"}
                          className="ml-auto"
                          checked={igniterAttributes.debug}
                          onCheckedChange={(checked) => {
                            ExecutionSDK.actions.igniter.setShouldDebug(
                              checked,
                            );
                          }}
                        />
                      </DropdownMenu.StaticItem>
                    </DropdownMenu.Group>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </ButtonGroup>
            </>
          ) : null}
          {status === "running" && (
            <>
              <Tipped label="Pause">
                <ControlButton
                  loading={awaitedConfirmation.has("paused")}
                  icon={SystemIcons.PauseFill}
                  size="icon-sm"
                  iconClassName="scale-80"
                  variant="ghost-warning"
                  onClick={handlePause}
                />
              </Tipped>
              <Tipped label="Terminate">
                <ControlButton
                  loading={awaitedConfirmation.has("terminated")}
                  icon={SystemIcons.X}
                  size="icon-sm"
                  iconClassName="scale-80"
                  variant="ghost-destructive"
                  onClick={handleTerminate}
                />
              </Tipped>
            </>
          )}
          {status === "paused" && (
            <>
              <ControlButton
                loading={awaitedConfirmation.has("resumed")}
                icon={SystemIcons.Play}
                variant="ghost-success"
                size="icon-sm"
                onClick={handleResume}
              />
              <Tipped label="Suspend">
                <ControlButton
                  loading={awaitedConfirmation.has("suspended")}
                  icon={SystemIcons.SquareFill}
                  size="icon-sm"
                  iconClassName="scale-80"
                  variant="ghost-warning"
                  onClick={handleSuspend}
                />
              </Tipped>
              <Tipped label="Terminate">
                <ControlButton
                  loading={awaitedConfirmation.has("terminated")}
                  icon={SystemIcons.X}
                  size="icon-sm"
                  iconClassName="scale-80"
                  variant="ghost-destructive"
                  onClick={handleTerminate}
                />
              </Tipped>
            </>
          )}
          {currentExecution &&
            (status === "completed" ||
              status === "failed" ||
              status === "terminated") && (
              <>
                <Tipped label="Clear Execution">
                  <Button
                    size="icon-sm"
                    variant="ghost-destructive"
                    onClick={handleClear}
                  >
                    <SystemIcons.Trash2 className="scale-80" />
                  </Button>
                </Tipped>
              </>
            )}

          {status === "running" || status === "paused" ? null : (
            <HistoryPopoverButton />
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default ExecutionControls;

// One entry per igniteable node. Elects that node as the run's entry point —
// a plain Run starts none of them.
const IgniterRunItem = ({ nodeId }: { nodeId: Workflow.Node.Id }) => {
  const ui = WorkbenchSDK.useStore((s) => s.selectors.node.getUI(s, nodeId));

  return (
    <DropdownMenu.Item onSelect={() => handleRunWithIgniteableNode(nodeId)}>
      <LazyIcon name={ui.icon ?? ""} className="mr-2" />
      Run via {ui.displayName}
    </DropdownMenu.Item>
  );
};

const HistoryPopoverButton = () => {
  return (
    <Popover.Root>
      <Tipped label="Show Execution History">
        <Popover.Trigger asChild>
          <Button size="icon-sm" variant="ghost">
            <SystemIcons.History className="scale-80" />
          </Button>
        </Popover.Trigger>
      </Tipped>
      <Popover.Content
        sideOffset={14}
        className="px-0 pb-0 rounded-xl overflow-hidden"
      >
        <ExecutionHistoryPanel />
      </Popover.Content>
    </Popover.Root>
  );
};
