import { addEdge, applyEdgeChanges, applyNodeChanges, ReactFlow, Background, useEdgesState, useNodesState } from '@xyflow/react'
import React, { memo, useCallback, useEffect, useMemo } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { createCanvasCallbacks, canvasProps } from './props'
import DataViewerWrapper from '@/CustomNodes/GenericNode/DataViewerWrapper'
import useFlowsManagerStore from '@/stores/flowsManagerStore'
import { ShelfSDK } from '@/SDKs/ShelfSDK/sdk'
import { Workflow } from '@vx-agent-builder/shared/types'

type NodeDriver = WorkbenchSDK.NodeDriver
type EdgeDriver = WorkbenchSDK.EdgeDriver

const WorkflowCanvas: React.FC = memo(() => {

    const currentFlow = useFlowsManagerStore(s => s.currentFlow)

    useMemo(() => {
        if (!currentFlow) return

        WorkbenchSDK.openWorkflow(currentFlow.id as Workflow.Id)
    }, [currentFlow])

    return (
        <div ref={WorkbenchSDK.canvasWrapper} className='w-full h-full relative '>
            {/* <div className="fixed top-10 z-10 left-[400px] text-white bg-neutral-900">
                <DataVisualizer />
            </div> */}
            <CanvasRenderer />
        </div>
    )
})

export default WorkflowCanvas

const CanvasRenderer = memo(() => {

    const workflow = WorkbenchSDK.useStore(s => s.workflow)

    const initial = useMemo(() => WorkbenchSDK.createDrivers(workflow), [workflow.data.nodes, workflow.data.edges])
    const [nodeDrivers, setNodeDrivers] = useNodesState<NodeDriver>(initial.nodeDrivers)
    const [edgeDrivers, setEdgeDrivers] = useEdgesState<EdgeDriver>(initial.edgeDrivers)

    useEffect(() => {
        setNodeDrivers(initial.nodeDrivers)
        setEdgeDrivers(initial.edgeDrivers)
    }, [initial.nodeDrivers, initial.edgeDrivers, setNodeDrivers, setEdgeDrivers])

    const canvasCallbacks = useMemo(() =>
        createCanvasCallbacks(setNodeDrivers, setEdgeDrivers),
        [setNodeDrivers, setEdgeDrivers]
    )

    return (
        <>
            <ReactFlow<NodeDriver, EdgeDriver>
                nodes={nodeDrivers}
                edges={edgeDrivers}
                // connectionLineComponent={NodeConnectionLine}
                {...canvasProps}
                {...canvasCallbacks}
            >
                <Background size={2} gap={40} />
            </ReactFlow>
        </>
    )
})

const DataVisualizer = () => {
    // const [nodeDrivers, edgeDrivers] = WorkbenchSDK.useDriver(s => [s.nodeDrivers, s.edgeDrivers])
    // const workbenchSDKState = WorkbenchSDK.useStore(s => s)
    const shelfSDK = ShelfSDK.useStore(s => s)

    return (
        <DataViewerWrapper src={{
            shelfSDK
            // state
        }} />
    )
}