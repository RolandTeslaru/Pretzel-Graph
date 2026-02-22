import React, { Suspense } from 'react'
import { type BaseIconProps } from './baseIcon'
import { lazyIconsMapping } from './lazyIconImports'
import { SystemIcons } from '.'
import { Skeleton } from '../foundations/skeleton'

interface Props extends BaseIconProps {
    name: string
}

const lazyComponentCache = new Map<string, React.LazyExoticComponent<any>>();

export const LazyIcon: React.FC<Props> = ({ name, ...props }) => {
    if (name in SystemIcons) {
        const Comp = SystemIcons[name as keyof typeof SystemIcons];
        return <Comp {...props} />
    }

    const loader = lazyIconsMapping[name as keyof typeof lazyIconsMapping];
    if (!loader) {
        return null;
    }

    let IconComponent = lazyComponentCache.get(name);
    if (!IconComponent) {
        IconComponent = React.lazy(loader as any);
        lazyComponentCache.set(name, IconComponent);
    }

    return (
        <Suspense fallback={<Skeleton className={props.className} />}>
            <IconComponent {...props} />
        </Suspense>
    )
}
