import React, { Suspense, useMemo } from 'react'
import { BaseIcon, type BaseIconProps } from './baseIcon'
import { lazyIconsMapping } from './lazyIconImports'
import { SystemIcons } from '.'
import { Skeleton } from '../foundations/skeleton'

interface Props extends BaseIconProps {
    name: string
}

export const LazyIcon: React.FC<Props> = ({ name, ...props }) => {
    if (name in SystemIcons) {
        const Comp = SystemIcons[name];
        return <Comp {...props} />
    }

    const IconComponent = useMemo(() => {
        const loader = lazyIconsMapping[name];
        if (!loader) return null;
        return React.lazy(loader);
    }, [name]);
    if (!IconComponent) {
        // Icon name not found in map
        return null;
    }

    return (
        <Suspense fallback={
            <>
                <Skeleton className={props.className} />
            </>
        }>
            <IconComponent {...props} />
        </Suspense>
    )
}

