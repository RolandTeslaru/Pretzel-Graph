import { memo, useCallback, useMemo } from "react";
import { Spinner } from "../../../foundations";
import { TreeSDK } from "../sdk";

interface Props {
    treeKey:            string
    path:               string
    level:              number
    siblingsLen:        number
    indexToParent:      number
    renderBranch:       TreeSDK.Callbacks.RenderBranch
    branchLoader:       TreeSDK.Callbacks.BranchLoader
}


export type BranchTemplate = React.FC<{
    children:        React.ReactNode,
    className?:      string,
    onClick?:        (e: React.MouseEvent<HTMLElement, MouseEvent>) => void,
    onContextMenu?:  (e: React.MouseEvent<HTMLElement, MouseEvent>) => void,
    listClassNames?: string,
}> & React.HTMLAttributes<HTMLDivElement>

const Branch: React.FC<Props> = memo(({
    treeKey, path, level, siblingsLen, indexToParent, renderBranch, branchLoader
}) => {
    const isFinalSibling = siblingsLen - 1 === indexToParent
    const branch = TreeSDK.useStore(s => s.flatMaps.get(treeKey)?.get(path))!

    const onExpandButtonClick = async () => {
        if (branch.isExpanded)
            TreeSDK.actions.branch.setExpanded(treeKey, branch.currentPath, false)
        else {
            if (branch.children || branch.isLoading)
                TreeSDK.actions.branch.setExpanded(treeKey, branch.currentPath, true)
            else {
                TreeSDK.actions.branch.setLoading(treeKey, branch.currentPath, true);
                TreeSDK.actions.branch.handleChildrenLoad(treeKey, branch, branchLoader)
            }
        }
    }
   

    const BranchTemplate = ({ children, className, listClassName, ...rest }) => (
        <li
            role="treeItem"
            aria-selected="false"
            aria-expanded={branch.isExpanded}
            aria-level={level}
            tabIndex={-1}
            className={listClassName + " relative min-w-full w-fit"}
        >
            <div className={`${className} relative min-h-8 h-fit min-w-full flex items-center gap-2`}
                style={{ paddingLeft: `${level * 24}px` }}
                {...rest}
            >
                {branch.canBeExpanded ?
                    <>
                        <div className={`content-[""] absolute top-0 min-w-[1px] bg-neutral-500  h-[calc(50%_-_6px)] ml-[7.5px]`} />
                        <BranchExpandButton
                            isExpanded={branch.isExpanded}
                            isLoading={branch.isLoading}
                            onClick={onExpandButtonClick}
                            level={level}
                        />
                        {!branch.isExpanded && !isFinalSibling && (
                            <div className={`content-[""] absolute bottom-0 min-w-[1px] h-[calc(50%_-_6px)] bg-neutral-500  ml-[7.5px]`} />
                        )}
                    </>
                    : <>
                        {isFinalSibling ?
                            <TreeLineCorner level={level} />
                            :
                            <TreeLine level={level} />
                        }
                        <TreeLineConnect />
                    </>
                }
                {children}
            </div>
            {renderBranchChildren({
                branch,
                treeKey,
                level,
                renderBranch,
                branchLoader
            })}
        </li>
    )

    if(branch.isMounted === false)
        return null

    if (branch.overrideRenderBranch)
        return branch.overrideRenderBranch({ treeKey, branch, BranchTemplate })
    else if (renderBranch)
        return renderBranch({ treeKey, branch, BranchTemplate })

    return null
})


const renderBranchChildren: TreeSDK.Callbacks.RenderChildren = (
    { branch, treeKey, level, renderBranch, branchLoader }
) => {
    if (branch.canBeExpanded && branch.isExpanded) {
        const branchChildren = Array.from(branch.children).filter(([_, cb]) => cb.isMounted === true)
        return (
            <ul role="group" className="!m-0 !p-0">
                {branchChildren.map(([_, childBranch], i) =>
                    <Branch
                        key={`tree-${branch.key}-${i}`}
                        treeKey={treeKey}
                        path={childBranch.currentPath}
                        siblingsLen={branch.children.size}
                        indexToParent={i}
                        level={level + 1}
                        renderBranch={renderBranch}
                        branchLoader={branchLoader}
                    />
                )}
            </ul>
        )
    }

    return <></>
}


interface BranchExpandButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
    isExpanded: boolean
    isLoading: boolean
    level: number
}   

const BranchExpandButton: React.FC<BranchExpandButtonProps> = ({
    isExpanded,
    isLoading,
    ...props
}) => {
    return (
        <button
            className="!cursor-pointer transition-transform duration-200"
            {...props}
        >
            {isLoading
                ? <Spinner className="w-4" />
                : <svg
                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                    xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth={1} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" strokeWidth="0.5" />
                    <path d="m10 8 4 4-4 4" />
                </svg>
            }


        </button>
    )
}



export const TreeLine = memo(({ level }: { level: number }) => {
    return <div className={`content-[""] absolute top-0 w-[1px] min-w-[1px] h-full
                            ml-[7.5px]  bg-neutral-500 left-[${level * 16 + 4}px ]`}
    />
})


interface TreeLineCornerProps {
    level: number;
    size: "sm" | "md";
}


export const TreeLineCorner = memo(({ level }: { level: number }) => {
    return <div className={`content-[""] absolute top-0 w-[1px] min-[1px]
                            ml-[7.5px] h-1/2!  bg-neutral-500  left-[${level * 16 + 4}px ]`}></div>
})

export const TreeLineConnect = memo(() => {
    return <div className={`ml-2 w-2 min-w-2 h-[1px] content-[" "] bg-neutral-500`}></div>
})



export default Branch