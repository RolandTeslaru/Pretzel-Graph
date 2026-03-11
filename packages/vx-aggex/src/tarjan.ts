import { Workflow } from "@vx-agent-editor/shared/domain";

    type TarjanVertex = {
    index: number
    node: Workflow.Node,
    lowLink: number,
    onStack: boolean
}

export class Compiler {

    public compile(workflow: Workflow, wfCache: Workflow.Cache) {
        const nodes = workflow.data.nodes;

        const TVerticesMap: Record<Workflow.Node.Id, TarjanVertex> = {}

        Object.values(nodes).forEach(n => {
            TVerticesMap[n.id] = {
                index: -1,
                node: n,
                lowLink: -1,
                onStack: false
            }
        })

        let currentIndex = 0
        const stack: TarjanVertex[] = []
        const sccs: Set<Workflow.Node.Id>[] = []

        for (const node of Object.values(nodes)) {
            if (TVerticesMap[node.id].index === -1) {
                strongConnect(TVerticesMap[node.id])
            }
        }

        function strongConnect(v: TarjanVertex) {
            v.index = currentIndex
            v.lowLink = currentIndex
            currentIndex++
            stack.push(v)
            v.onStack = true

            const outgoingEdges = wfCache.outgoingEdgesMap[v.node.id]
            if (outgoingEdges) {
                for (const _nextNodeId of Object.keys(outgoingEdges)) {
                    const nextNodeId = _nextNodeId as Workflow.Node.Id
                    const w = TVerticesMap[nextNodeId]

                    if (w.index === -1) {
                        strongConnect(w)
                        v.lowLink = Math.min(v.lowLink, w.lowLink)
                    } else if (w.onStack) {
                        v.lowLink = Math.min(v.lowLink, w.index)
                    }
                }
            }

            if (v.lowLink === v.index) {
                const scc = new Set<Workflow.Node.Id>()
                let w: TarjanVertex
                do {
                    w = stack.pop()!
                    w.onStack = false
                    scc.add(w.node.id)
                } while (w !== v)
                sccs.push(scc)
            }
        }

        const nodeToScc: Record<Workflow.Node.Id, Set<Workflow.Node.Id>> = {}
        for (const scc of sccs) {
            for (const nodeId of scc) {
                nodeToScc[nodeId] = scc
            }
        }

        return { sccs, nodeToScc }
    }
}
