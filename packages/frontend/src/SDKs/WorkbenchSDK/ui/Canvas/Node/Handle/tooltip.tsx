import { Workflow } from '@vx-agent-editor/shared/types';
import React, { useMemo } from 'react'
import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk';
import LangchainTypeBadge from '../../../LangchainTypeBadge';

interface Props {
  handleType: 'target' | 'source'
  field: Workflow.Node.Input | Workflow.Node.Output
  nodeId: Workflow.Node.Id
  isDraggedHandleCompatible: boolean
  draggedHandle: WorkbenchSDK.Handle | null
}

const HandleTooltipContent: React.FC<Props> = ({
  handleType,
  field,
  nodeId,
  isDraggedHandleCompatible,
  draggedHandle
}) => {
  const hasMultipleTypes = handleType.length > 1
  const isDifferentNode = draggedHandle?.nodeId !== nodeId

  const mappedTypes = useMemo(() => {
    return Array.from(field.langChainDataTypes)
  }, [field.langChainDataTypes])

  const isConnecting = !!draggedHandle && isDifferentNode;
  const isInput = handleType === 'target';

  if (draggedHandle?.field === field) {
    return <div className="font-medium">Can't connect to the same node</div>;
  }

  return (
    <div className="font-medium">
      <div className="flex items-center gap-1.5">
        <StatusMessage
          isInput={isInput}
          isConnecting={isConnecting}
          isDraggedHandleCompatible={isDraggedHandleCompatible}
          hasMultipleTypes={hasMultipleTypes}
        />

        {mappedTypes.map((dataType, index) => (
          <LangchainTypeBadge
            key={`${index}-${dataType}`}
            dataType={dataType}
            left={handleType === 'target'}
            isInput={isInput}
          />
        ))}
        {isConnecting && <span>{isInput ? "input" : "output"}</span>}
      </div>
      {!isConnecting && <HelperText isInput={isInput} />}
    </div>
  )
}

export default HandleTooltipContent





// --- Sub-components ---
function StatusMessage({
  isInput,
  isConnecting,
  isDraggedHandleCompatible,
  hasMultipleTypes
}: {
  isInput: boolean;
  isConnecting: boolean;
  isDraggedHandleCompatible: boolean;
  hasMultipleTypes: boolean
}) {
  const plural = hasMultipleTypes ? "s" : "";
  if (!isConnecting) {
    return (
      <span className="text-xs">
        {isInput ? `Input${plural} type${plural}` : `Output${plural} type${plural}`}:
      </span>
    );
  }
  return isDraggedHandleCompatible ? (
    <span>
      <span className="font-semibold">Connect</span> to
    </span>
  ) : (
    <span>Incompatible with</span>
  );
}



function HelperText({ isInput }: { isInput: boolean }) {
  const targetLabel = !isInput ? "inputs" : "outputs";

  return (
    <div className="mt-2 flex flex-col gap-0.5 text-xs leading-6">
      <div>
        <b>Drag</b> to connect compatible {targetLabel}
      </div>
      <div>
        <b>Click</b> to filter compatible {targetLabel} and components
      </div>
    </div>
  );
}