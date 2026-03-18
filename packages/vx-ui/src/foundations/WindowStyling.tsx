
import React from "react"
import classNames from 'classnames';
import { DotPattern } from "../components/DotPattern";

export namespace WindowStyling {
    export type Props = React.HTMLAttributes<HTMLDivElement> & {
        ref?: React.Ref<HTMLDivElement>
        isDetached?: boolean;
        detachedClassName?: string
        detachedStyling?: React.CSSProperties
        contentClassName?: string
    }
    export type CrossProps = Props & {
        crossesClassName?: string
    }
    export type BracketProps = Props & {
        bracketsClassName?: string,
        show?: boolean
    }
}


const CrossWindowStyling = React.forwardRef<HTMLDivElement, WindowStyling.CrossProps>(({
    className, style, children, isDetached = false, detachedClassName, detachedStyling, crossesClassName, ...rest
}, ref) => {
    return (
        <div
            ref={ref}
            className={classNames(
                isDetached && ['rounded-none', detachedClassName],
                'relative flex flex-col gap-2 border border-white/20',
                className,
                { "rounded-none": isDetached },
            )}
            style={{
                ...(isDetached ? detachedStyling : {}),
                ...style,
            }}
            {...rest}
        >
            {isDetached && <DotPattern />}
            <CrossIcon className={classNames("absolute h-3 w-3 top-0 left-0 transform -translate-x-1/2 -translate-y-1/2", crossesClassName)} />
            <CrossIcon className={classNames("absolute h-3 w-3 top-0 right-0 transform translate-x-1/2 -translate-y-1/2", crossesClassName)} />
            <CrossIcon className={classNames("absolute h-3 w-3 bottom-0 left-0 transform -translate-x-1/2 translate-y-1/2", crossesClassName)} />
            <CrossIcon className={classNames("absolute h-3 w-3 bottom-0 right-0 transform translate-x-1/2 translate-y-1/2", crossesClassName)} />
            {children}
        </div>
    )
})

const BracketWindowStyling: React.FC<WindowStyling.BracketProps> = ({
    className, contentClassName, style, children, isDetached = false, detachedClassName, detachedStyling, bracketsClassName, show = true, ...rest
}) => {
    if (show === false) return null

    return (
        <div
            className={classNames(
                isDetached && ['rounded-none', detachedClassName],
                'relative border border-white/20 h-fit',
                className,
            )}
            style={{
                ...(isDetached ? detachedStyling : {}),
                ...style,
            }}
            {...rest}
        >
            {isDetached && <DotPattern />}
            <div className={`${bracketsClassName} absolute -top-1 -left-1 w-3 h-3 border-white border-l border-t`} />
            <div className={`${bracketsClassName} absolute -top-1 -right-1 w-3 h-3 border-white border-r border-t`} />
            <div className={`${bracketsClassName} absolute -bottom-1 -left-1 w-3 h-3 border-white border-l border-b`} />
            <div className={`${bracketsClassName} absolute -bottom-1 -right-1 w-3 h-3 border-white border-r border-b`} />
            <div className={contentClassName + " overflow-y-auto flex flex-col size-full  "}>
                {children}
            </div>
        </div>
    )
}



const StandardWindowStyling = (props: WindowStyling.Props) => {
    const { children, className, isDetached, style, detachedStyling, detachedClassName, ...rest } = props

    return (
        <div
            className={classNames(
                isDetached && ['rounded-none', detachedClassName],
                'p-2 backdrop-blur-md bg-card  border border-border rounded-2xl flex flex-col gap-2',
                className,
                { "rounded-none": isDetached },
            )}
            style={{
                ...(isDetached ? detachedStyling : {}),
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.6), 0 1px 6px -4px rgb(0 0 0 / 0.6", ...style,
            }}
            {...rest}
        >
            {children}
        </div>
    )
}



const CrossIcon = ({ className, ...rest }: any) => {
    return (
        <div
            className={className}
            {...rest}
        >
            <div className="absolute w-full border-t !border-white top-1/2 left-0 -translate-y-1/2" />
            <div className="absolute h-full border-l !border-white left-1/2 top-0 -translate-x-1/2" />
        </div>
    );
};


export const WindowStyling = {
    Standard: StandardWindowStyling,
    Cross: CrossWindowStyling,
    Bracket: BracketWindowStyling
}