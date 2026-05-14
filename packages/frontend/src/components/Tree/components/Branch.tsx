import React from 'react'
import type { Tree } from '../domain'

interface Props {
    branch: Tree.Branch
}

const Branch = ({ branch }: Props) => {

    const children = Object.values(branch.childBranches ?? {});

    const canBeExpanded = children.length > 0
    const isExpanded = branch.isExpanded

    return (
        <li
            role='treeBranch'
            aria-selected="false"
            aria-expanded={branch.isExpanded}
            aria-level={branch.path.length}
            tabIndex={-1}
            className='relative'
        >
            {/* Actual Branch */}
            <div className={`relative`}
                style={{ paddingLeft: `${branch.path.length * 24}px` }}
            >
                {canBeExpanded && (
                    <>
                        <button>
                            <svg
                                className={`transition-transform duration-200 ${branch.isExpanded ? 'rotate-90' : 'rotate-0'}`}
                                xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth={1} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="18" height="18" x="3" y="3" rx="2" strokeWidth="0.5" />
                                <path d="m10 8 4 4-4 4" />
                            </svg>
                        </button>
                    </>
                )}
            </div>


            {/* Render Children */}
            {canBeExpanded && isExpanded && (
                <ul role='tree' className='ml-4'>
                    {children.map((child) => (
                        <Branch key={child.path.join('.')} branch={child} />
                    ))}
                </ul>
            )}
        </li>
    )
}

export default Branch
