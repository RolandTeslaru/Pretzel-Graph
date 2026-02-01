const lazyIconMapPromise = import("./lazyIconMap").then(
    (module) => module.lazyIconMap
)

const EAGER_LOADED_ICONS = {
    
}

// export const prefetchIcon = async (iconName: string): Promise<void> => {
//     if(!iconName) return

//     try {
//         const iconMap = await lazyIconMapPromise;
//         const mappedLoader = iconMap[iconName];
//     }
// }