import { Workflow } from "./Workflow"

export namespace Algorithms {
    export namespace Tarjan {
        export function deriveSCCs(
            nodes: Workflow["data"]["nodes"],
            arcsMap: ReturnType<typeof Workflow.deriveArcs>,
        ) {
            const n = Object.keys(nodes).length

            const indexOf: Record<Workflow.Node.Id, number> = {};
            const nodeByIndex: Array<Workflow.Node.Id> = [];

            const lowLink: Array<number> = new Array(n) // where index is from the index map and value is the low link value

            const sccs_index: Array<Array<number>> = []
            const sccs_id: Array<Set<Workflow.Node.Id>> = [];

            let curIdx = 0

            const stack: Array<number> = [];
            const onStack: Array<boolean> = new Array(n).fill(false);

            // Randomly pick any non indexed nodes;
            Object.keys(nodes).forEach(_nodeId => {
                const nodeId = _nodeId as Workflow.Node.Id;

                if (indexOf[nodeId] != undefined)
                    return;

                function dfs(nodeId: Workflow.Node.Id) {
                    const arcs = arcsMap[nodeId];

                    const nodeIdx = curIdx;

                    nodeByIndex[curIdx] = nodeId;

                    indexOf[nodeId] = curIdx
                    lowLink[nodeIdx] = nodeIdx // is subject to change when backtracking;
                    stack.push(nodeIdx);
                    onStack[nodeIdx] = true;

                    curIdx++;


                    for (const neighbor of arcs) {
                        if (indexOf[neighbor] === undefined) {
                            dfs(neighbor);
                            lowLink[nodeIdx] = Math.min(lowLink[nodeIdx], lowLink[indexOf[neighbor]])
                        } else if (onStack[indexOf[neighbor]]) {
                            lowLink[nodeIdx] = Math.min(lowLink[nodeIdx], indexOf[neighbor])
                        }
                    }

                    if (lowLink[nodeIdx] === nodeIdx) {
                        const scc: number[] = [];
                        const sccIds = new Set<Workflow.Node.Id>();
                        let poppedIdx: number;
                        do {
                            poppedIdx = stack.pop()!;
                            onStack[poppedIdx] = false;
                            scc.push(poppedIdx);
                            sccIds.add(nodeByIndex[poppedIdx]);
                        } while (poppedIdx !== nodeIdx);
                        sccs_index.push(scc);
                        sccs_id.push(sccIds);
                    }

                    return lowLink[nodeIdx];
                }

                dfs(nodeId);
            })

            return [indexOf, nodeByIndex, sccs_index, sccs_id] as const;
        }
    }

    // Based on Donald B. Johnson 1975 paper
    // "Finding all the elementary circuits of a directed graph"
    //
    // High-level structure:
    //   1. For each SCC (from Tarjan), build an induced working set of members.
    //   2. Pick a start vertex s from the SCC, run a blocking DFS to enumerate
    //      every elementary cycle that contains s.
    //   3. Remove s from the working set and repeat with the next vertex.
    //   4. The blocking scheme (blocked + blockedMap) prunes branches that
    //      provably cannot lead to a new cycle, giving the O((V+E)(C+1)) bound.
    export namespace Johnson {
        export function getAllCycles(
            arcsMap: ReturnType<typeof Workflow.deriveArcs>,
            sccs_id: Array<Set<Workflow.Node.Id>>
        ): Workflow.Node.Id[][] {
            const cycles: Workflow.Node.Id[][] = [];

            for (const scc of sccs_id) {
                // Trivial SCC (size 1 with no self-loop) cannot contain a cycle.
                if (scc.size === 1) {
                    const only = scc.values().next().value as Workflow.Node.Id;
                    if (!arcsMap[only]?.has(only))
                        continue;
                    cycles.push([only, only]);
                    continue;
                }

                // Working set: the induced subgraph shrinks as we remove each
                // processed start vertex. Iterating arcs is filtered through this.
                const remaining = new Set(scc);
                const order = [...scc];

                for (const start of order) {
                    if (!remaining.has(start)) continue;

                    const blocked = new Set<Workflow.Node.Id>();
                    const blockedMap = new Map<Workflow.Node.Id, Set<Workflow.Node.Id>>();
                    const pathStack: Workflow.Node.Id[] = [];

                    function unblock(u: Workflow.Node.Id) {
                        blocked.delete(u);
                        const deps = blockedMap.get(u);
                        if (!deps) return;
                        blockedMap.delete(u);
                        for (const w of deps) {
                            if (blocked.has(w)) unblock(w);
                        }
                    }

                    function circuit(v: Workflow.Node.Id): boolean {
                        let foundCycle = false;
                        pathStack.push(v);
                        blocked.add(v);

                        for (const w of arcsMap[v] ?? []) {
                            if (!remaining.has(w)) continue;

                            if (w === start) {
                                // Elementary cycle = current path + back to start.
                                cycles.push([...pathStack, start]);
                                foundCycle = true;
                            } else if (!blocked.has(w)) {
                                if (circuit(w)) foundCycle = true;
                            }
                        }

                        if (foundCycle) {
                            // Any node on a successful path must be unblocked so
                            // later searches from different starts can revisit it.
                            unblock(v);
                        } else {
                            // Defer unblocking: if a neighbor later finds a cycle,
                            // it'll cascade-unblock v via blockedMap.
                            for (const w of arcsMap[v] ?? []) {
                                if (!remaining.has(w)) continue;
                                let deps = blockedMap.get(w);
                                if (!deps) {
                                    deps = new Set();
                                    blockedMap.set(w, deps);
                                }
                                deps.add(v);
                            }
                        }

                        pathStack.pop();
                        return foundCycle;
                    }

                    circuit(start);
                    // Remove start from the induced subgraph so we don't
                    // rediscover the same cycles from a later start vertex.
                    remaining.delete(start);
                }
            }

            return cycles;
        }
    }
}