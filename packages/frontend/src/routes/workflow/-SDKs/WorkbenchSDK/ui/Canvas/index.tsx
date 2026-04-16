import { ReactFlow, Background, useEdgesState, useNodesState } from '@xyflow/react'
import React, { memo, useEffect, useMemo } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { createCanvasCallbacks, canvasProps } from './props'
import { createCycleSelectionDrivers } from '../../utils/createDrivers'
import { SelectionContextMenu } from './SelectionContextMenu'

type NodeDriver = WorkbenchSDK.NodeDriver | WorkbenchSDK.CycleSelectionNodeDriver
type EdgeDriver = WorkbenchSDK.EdgeDriver

const WorkflowCanvas: React.FC = memo(() => {
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            WorkbenchSDK.runtime.lastMousePosition.x = e.clientX;
            WorkbenchSDK.runtime.lastMousePosition.y = e.clientY;
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div ref={WorkbenchSDK.canvasWrapper} className='w-full h-full relative'>
            <CanvasRenderer />
            <SelectionContextMenu />
        </div>
    )
})

export default WorkflowCanvas

const CanvasRenderer = memo(() => {

    const workflow = WorkbenchSDK.useStore(s => s.workflow)

    const baseDrivers = useMemo(() => WorkbenchSDK.createDrivers(workflow), [workflow.data.nodes, workflow.data.edges])
    const [nodeDrivers, setNodeDrivers] = useNodesState<NodeDriver>(baseDrivers.nodeDrivers)
    const [edgeDrivers, setEdgeDrivers] = useEdgesState<EdgeDriver>(baseDrivers.edgeDrivers)

    const cycleIssues = WorkbenchSDK.useStore(s => s.issues.cycles);
    const cycleSelectionDrivers = useMemo(
        () => createCycleSelectionDrivers(cycleIssues, workflow),
        [cycleIssues, workflow.data.ui.layout]
    );

    useEffect(() => {
        setNodeDrivers(baseDrivers.nodeDrivers)
        setEdgeDrivers(baseDrivers.edgeDrivers)
    }, [baseDrivers.nodeDrivers, baseDrivers.edgeDrivers, setNodeDrivers, setEdgeDrivers])

    useEffect(() => {
        const driver = WorkbenchSDK.runtime.canvasDriver
        if (driver)
            driver.setViewport(workflow.data.ui.viewport);

    }, [workflow.id])

    const canvasCallbacks = useMemo(() =>
        createCanvasCallbacks(setNodeDrivers, setEdgeDrivers),
        [setNodeDrivers, setEdgeDrivers]
    )

    return (
        <ReactFlow
            nodes={[...cycleSelectionDrivers, ...nodeDrivers]}
            edges={edgeDrivers}
            defaultViewport={workflow.data.ui.viewport}
            // connectionLineComponent={NodeConnectionLine}
            {...canvasProps}
            {...canvasCallbacks}
        >
            <Background size={2} gap={40} />
        </ReactFlow>
    )
})