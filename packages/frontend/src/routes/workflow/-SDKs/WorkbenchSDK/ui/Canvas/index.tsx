import { ReactFlow, Background, useEdgesState, useNodesState, useUpdateNodeInternals } from '@xyflow/react'
import React, { memo, useEffect, useMemo, useRef } from 'react'
import { WorkbenchSDK } from '../../sdk'
import { createCanvasCallbacks, canvasProps } from './props'
import { createCycleSelectionDrivers } from '../../utils/createDrivers'
import { useCanvasKeyBindings } from '../../hooks/useCanvasKeyBindings'
import { SelectionContextMenu } from './SelectionContextMenu'
import { PaneContextMenu } from './PaneContextMenu'
import { EdgeMarkerDefs } from './Edge/markers'

type NodeDriver = WorkbenchSDK.NodeDriver | WorkbenchSDK.CycleSelectionNodeDriver
type EdgeDriver = WorkbenchSDK.EdgeDriver

const WorkflowCanvas: React.FC = memo(() => {
    useCanvasKeyBindings()

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
            <EdgeMarkerDefs />
            <CanvasRenderer />
            <SelectionContextMenu />
            <PaneContextMenu />
        </div>
    )
})

export default WorkflowCanvas

const CanvasRenderer = memo(() => {

    const [workflowId, data] = WorkbenchSDK.useDocument(d => [d.workflowId, d.data])

    // Seed once; thereafter the canvas owns its drivers and we reconcile store changes
    // into them incrementally (below) so unchanged nodes/edges keep their identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const seed = useMemo(() => WorkbenchSDK.createDrivers(data), [])
    const [nodeDrivers, setNodeDrivers] = useNodesState<NodeDriver>(seed.nodeDrivers)
    const [edgeDrivers, setEdgeDrivers] = useEdgesState<EdgeDriver>(seed.edgeDrivers)

    const cycleIssues = WorkbenchSDK.useDocument(d => d.issues.cycles);
    const cycleSelectionDrivers = useMemo(
        () => createCycleSelectionDrivers(cycleIssues, data),
        [cycleIssues, data.ui.layout]
    );

    // Reconcile store -> drivers, preserving the identity of unchanged drivers. Edge
    // animations survive node moves/creates/undo because untouched edges keep their ref.
    // Canvas-originated changes are typically already applied (drag, add/remove via XYFlow
    // callbacks), so those reconcile to no-ops.
    useEffect(() => {
        setNodeDrivers(prev => WorkbenchSDK.reconcileNodeDrivers(prev as WorkbenchSDK.NodeDriver[], data))
        setEdgeDrivers(prev => WorkbenchSDK.reconcileEdgeDrivers(prev, data))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.nodes, data.edges, data.ui.layout, setNodeDrivers, setEdgeDrivers])

    useEffect(() => {
        const driver = WorkbenchSDK.runtime.canvasDriver
        if (driver)
            driver.setViewport(data.ui.viewport);

    }, [workflowId])

    const canvasCallbacks = useMemo(() =>
        createCanvasCallbacks(setNodeDrivers, setEdgeDrivers),
        [setNodeDrivers, setEdgeDrivers]
    )

    return (
        <ReactFlow
            nodes={[...cycleSelectionDrivers, ...nodeDrivers]}
            edges={edgeDrivers}
            defaultViewport={data.ui.viewport}
            {...canvasProps}
            {...canvasCallbacks}
        >
            <NewNodeHandleMeasurer />
            <Background size={2} gap={40} />
        </ReactFlow>
    )
})

// Rendered inside <ReactFlow> so the React Flow store provider is available.
// When nodes are inserted programmatically (paste/duplicate) alongside edges that
// connect to them, XYFlow can't position those edges until the new nodes' handles
// are measured (error #008). Force a re-measure on the next frame so freshly added
// nodes register their handle bounds and the edges route correctly.
const NewNodeHandleMeasurer = memo(() => {
    const nodes = WorkbenchSDK.useDocument(d => d.data.nodes)
    const updateNodeInternals = useUpdateNodeInternals()
    const knownNodeIds = useRef<Set<string>>(new Set(Object.keys(nodes)))

    useEffect(() => {
        const added = Object.keys(nodes).filter(id => !knownNodeIds.current.has(id))
        knownNodeIds.current = new Set(Object.keys(nodes))
        if (!added.length) return
        const raf = requestAnimationFrame(() => updateNodeInternals(added))
        return () => cancelAnimationFrame(raf)
    }, [nodes, updateNodeInternals])

    return null
})