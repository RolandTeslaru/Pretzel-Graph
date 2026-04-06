import React, { memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import Branch from "./Branch"
import { TreeSDK } from '../sdk'

interface Props {
    treeKey:         string
    src:             TreeSDK.Dummy.Tree
    className?:      string
    renderBranch?:   TreeSDK.Callbacks.RenderBranch
    branchLoader?:   TreeSDK.Callbacks.BranchLoader
    onFilterChange?: (value: string) => void
    cacheStrategy:   TreeSDK.CacheStrategy
}

const Tree: React.FC<Props> = memo(({
    src, className, branchLoader, treeKey, cacheStrategy, renderBranch = defaultRenderBranch
}) => {
    useMemo(() => {
        if(cacheStrategy === "cache")
            TreeSDK.actions.tree.ensure(treeKey, src);
        else if(cacheStrategy === "ephemeral")
            TreeSDK.actions.tree.rebuildInternal(treeKey, src)
    }, [src, treeKey])

    const processedTree = TreeSDK.useStore(s => s.trees.get(treeKey));
    const firstRootLayer = Object.values(processedTree)

    return (
        <ul role='tree'
            className={`${className} w-full`}
        >
            {firstRootLayer.map((branch, i) =>
                branch.isMounted
                ? <Branch
                    treeKey={treeKey}
                    key={branch.currentPath}
                    siblingsLen={firstRootLayer.length}
                    indexToParent={i}
                    level={0}
                    renderBranch={renderBranch}
                    branchLoader={branchLoader}
                    path={branch.currentPath}
                />
                : null
            )}
        </ul>
    )
})

export default Tree


const defaultRenderBranch: TreeSDK.Callbacks.RenderBranch = ({ branch, BranchTemplate }) => (
    <BranchTemplate>
        <div>{branch.key}</div>
    </BranchTemplate>
)
