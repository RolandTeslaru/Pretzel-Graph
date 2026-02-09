import React, { Suspense, useMemo } from 'react'
import { BaseIcon, type BaseIconProps } from './baseIcon'
import { lazyIconsMapping } from './lazyIconImports'
import { SystemIcons } from '.'

interface Props extends BaseIconProps {
    name: string
}

export const LazyIcon: React.FC<Props> = ({ name, ...props }) => {
    console.log("Attempting import of lazy icon", name)

    if (name in SystemIcons) {
        const Comp = SystemIcons[name];
        return <Comp {...props} />
    }

    const IconComponent = useMemo(() => {
        const loader = lazyIconsMapping[name];
        console.log(`Loader for ${name}`, loader)
        if (!loader) return null;
        return React.lazy(loader);
    }, [name]);
    if (!IconComponent) {
        // Icon name not found in map
        return null;
    }

    return (
        <Suspense fallback={null}>
            <BaseIcon {...props}>
                <IconComponent {...props} />
            </BaseIcon>
        </Suspense>
    )
}

