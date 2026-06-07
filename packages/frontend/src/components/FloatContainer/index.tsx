import React from 'react'

interface Props {
    className?: string
    children?: React.ReactNode
}

const FloatContainer: React.FC<Props> = ({className, children}) => {
    return (
        <div className={`flex flex-row gap-2 border border-border bg-card-float/60  rounded-full h-auto p-0.5 shadow-lg shadow-black/20 ${className || ''}`}>
            {children}
        </div>
    )
}

export default FloatContainer
