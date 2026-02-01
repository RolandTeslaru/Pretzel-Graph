import React, { useState, memo } from 'react'
import classNames from "classnames"
import { SystemIcons } from '../../icons'
import { WindowStyling } from "../../foundations"

export interface Props {
    title: string,
    children?: React.ReactNode
    defaultOpen?: boolean
    className?: string
    contentClassName?: string;
    headerClassName?: string;
    noPadding?: boolean
    icon?: React.ReactNode
    iconClassName?: string
}

const VerticalCollapsiblePanel: React.FC<Props> = memo(
    ({ title, children, className, defaultOpen = true, noPadding = false, contentClassName, headerClassName, icon, iconClassName }
    ) => {

        const [open, setOpen] = useState(defaultOpen);

        return (

            <WindowStyling.Cross className={
                classNames(className,
                    { "max-h-[40px]!": open === false },
                    { "max-h-[700px]": open === true },
                    { "px-1": noPadding === false },
                    `z-50 !py-0 my-1 !gap-0 h-fit relative !transform-gpu duration-500 ease bg-tertiary-thin backdrop-blur-2xl`)}
            >
                {/* Header*/}
                <div className={`${headerClassName} min-h-[40px] relative`}>
                    <ShowButton onClick={() => setOpen(!open)} isOpen={open} />

                    <p className='absolute top-1/2 left-1/2 -translate-1/2 text-nowrap text-xs font-roboto-mono text-label-secondary/90 font-extrabold antialiased'>
                        {title}
                    </p>

                    <div className='absolute top-[9px] h-5 w-5 right-3 !rounded-md overflow-hidden opacity-30'>
                        <PanelIcon icon={icon} iconClassName={iconClassName} />
                    </div>

                    <Separator open={open} />
                </div>


                {/* Content */}
                <div className={
                    classNames(contentClassName,
                        { "scale-[30%] opacity-0 pointer-events-none ": open === false },
                        { "scale-100 opacity-100 ": open === true },
                        { "px-1": noPadding === false },
                        'scroll-hidden text-xs h-auto gap-2 duration-300 flex flex-col py-1 bg-none !transform-gpu transition-all  overflow-hidden')}
                >
                    {children}
                </div>
            </WindowStyling.Cross>
        )
    })

export default VerticalCollapsiblePanel

const ShowButton = ({ onClick, isOpen }: { onClick: () => void, isOpen: boolean }) => {
    return (
        <button className='absolute top-1/2 -translate-y-1/2 h-6 w-6 flex hover:bg-neutral-800 rounded-xl cursor-pointer left-1'
            onClick={onClick}
        >
            <SystemIcons.ChevronRight className={` stroke-label-white scale-[60%] m-auto ${isOpen ? "rotate-90" : ""}`} />
        </button>
    )
}

const PanelIcon = ({ icon, iconClassName }: { icon: React.ReactNode, iconClassName?: string }) => {
    if (React.isValidElement(icon) && iconClassName) {
        return React.cloneElement(icon as React.ReactElement<any>, { className: iconClassName, width: 20, height: 20 })
    }
    return <>{icon}</>
}

const Separator = ({ open }: { open: boolean }) => {
    return <div className={`${open === true ? "opacity-100" : "opacity-0"} transition-all duration-300 absolute bottom-1 left-1/2 -translate-x-1/2 content-[" "] border-b w-[90%]`} style={{ borderImage: "linear-gradient(90deg, rgba(128,128,128,0) 0%, rgba(128,128,128,1) 50%, rgba(128,128,128,0) 100%) 1" }} />

}