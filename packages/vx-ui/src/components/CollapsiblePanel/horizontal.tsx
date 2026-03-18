import React, { useState, memo, useRef, useEffect } from 'react'
import classNames from "classnames"
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { WindowStyling } from '../../foundations';
import { SystemIcons } from '../../icons';

gsap.registerPlugin(useGSAP);
gsap.config({
    force3D: true
  })

export interface Props {
    title: string,
    children?: React.ReactNode
    defaultOpen?: boolean
    className?: string
    contentClassName?: string;
    noPadding?: boolean
    icon?: React.ReactNode
    iconClassName?: string
    openWidth?: gsap.TweenValue
    closedWidth?: gsap.TweenValue
}

const HorizontalCollapsiblePanel: React.FC<Props> = memo(
    (props) => {
        const [open, setOpen] = useState(props.defaultOpen ?? false);
        const ref = useRef(null)
        const { contextSafe } = useGSAP({ scope: ref })

        const playAnimation = contextSafe((isOpen: boolean) => {
            if (isOpen === true) {
                gsap.fromTo(".gsap-openIcon", {
                    rotate: 0
                }, {
                    rotate: 90
                })
                gsap.timeline({ defaults: {duration: 0.3}})
                    .fromTo(".gsap-content", {
                        scale: 1,
                        opacity: 1,
                        display: "flex"
                    }, {
                        scale: 0.5,
                        opacity: 0,
                    })
                    .set(".gsap-content", { display: "none"})
                    .to(ref.current, {
                        width: props.closedWidth ?? 35, 
                        delay: 0.2
                    })
                    .call(() => {
                        setOpen(false)
                    })
            } else {
                gsap.fromTo(".gsap-openIcon", {
                    rotate: 90
                }, {
                    rotate: 0
                })
                gsap.timeline({ defaults: {duration: 0.3}})
                    .set(".gsap-content", {
                        display: "none",
                    })
                    .to(ref.current, {
                        width: props.openWidth ?? "100%",
                    })
                    .set(".gsap-content",{
                        opacity: 0,
                        display: "flex",
                        scale: 0.5,
                        delay: 0.2
                    } )
                    .to(".gsap-content",{
                        scale: 1,
                        opacity: 1,
                    })
                    .call(() => {
                        setOpen(true)
                    })
            }
        })

        useEffect(() => {
            playAnimation(!props.defaultOpen)
        }, [])

        return (
            <WindowStyling.Cross
                className={classNames(props.className,
                    { "px-1": props.noPadding === false },
                    `z-50 flex flex-row h-full relative backdrop-blur-2xl bg-tertiary-thin`)}
                ref={ref}
            >
                {/* Header*/}
                <div className={` min-w-6 relative  `}>
                    <p className='absolute left-[1px] text-nowrap bottom-0 w-0 h-0 left -rotate-90 text-sm font-roboto-mono font-extrabold'>
                        {props.title}
                    </p>

                    <button className={"z-20 h-6 w-6 !cursor-pointer "}
                        onClick={() => {playAnimation(open)}}
                    >
                        <SystemIcons.ChevronRight className={`gsap-openIcon stroke-label-primary m-auto`} />
                    </button>
                    {/* Icon */}
                    <div className='absolute top-[9px] h-5 w-5 right-3 !rounded-md overflow-hidden opacity-30'>
                        {props.icon && React.isValidElement(props.icon) && props.iconClassName
                            ? React.cloneElement(props.icon as React.ReactElement<any>, { className: props.iconClassName, width: 20, height: 20 })
                            : props.icon
                        }
                    </div>
                </div>
                {/* Content */}
                <div className={
                    classNames(props.contentClassName,
                        { "px-1": props.noPadding === false },
                        'text-xs  w-full flex flex-col py-2 bg-none',
                        "gsap-content"
                    )}
                >
                    {props.children}
                </div>
            </WindowStyling.Cross>
        )
    })

export default HorizontalCollapsiblePanel
