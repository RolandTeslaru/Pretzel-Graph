import React, { Suspense, useMemo } from 'react'
import type { BaseIconProps } from './baseIcon'
import { lazyIconsMapping } from './lazyIconImports'

interface Props extends BaseIconProps {
    name: keyof typeof lazyIconsMapping
}

export const LazyIcon: React.FC<Props> = ({ name, ...props }) => {
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
        <Suspense fallback={speechSynthesis}>
            <IconComponent {...props} />
        </Suspense>
    )
}

