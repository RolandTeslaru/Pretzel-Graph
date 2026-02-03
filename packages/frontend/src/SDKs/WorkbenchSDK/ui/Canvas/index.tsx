import { ReactFlow, Background, useEdgesState, useNodesState } from '@xyflow/react'
import React, { memo, useEffect, useMemo } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { createCanvasCallbacks, canvasProps } from './props'

type NodeDriver = WorkbenchSDK.NodeDriver
type EdgeDriver = WorkbenchSDK.EdgeDriver

const WorkflowCanvas: React.FC = memo(() => {
    return (
        <div ref={WorkbenchSDK.canvasWrapper} className='w-full h-full relative '>

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

    useEffect(() => {
        const driver = WorkbenchSDK.runtime.canvasDriver
        if(driver)
            driver.setViewport(workflow.data.ui.viewport);

    }, [workflow.id])

    const canvasCallbacks = useMemo(() =>
        createCanvasCallbacks(setNodeDrivers, setEdgeDrivers),
        [setNodeDrivers, setEdgeDrivers]
    )

    return (
        <ReactFlow<NodeDriver, EdgeDriver>
            nodes={nodeDrivers}
            edges={edgeDrivers}
            // connectionLineComponent={NodeConnectionLine}
            {...canvasProps}
            {...canvasCallbacks}
        >
            <Background size={2} gap={40} />
        </ReactFlow>
    )
})