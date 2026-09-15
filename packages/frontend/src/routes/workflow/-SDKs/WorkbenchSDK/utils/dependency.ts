import { Skill, type Dependency } from '@pretzel-graph/shared/domain'

export interface DependencyDisplay {
    name:   string
    detail: string | null
    icon:   string
    accent: string | null
}

// How an embedded dependency is shown: its name, a secondary line, its icon and accent.
export function getDependencyDisplay(value: Dependency.Value): DependencyDisplay {
    switch (value.kind) {
        case 'draftWorkflow':
            return { name: value.display_name, detail: null, icon: 'Graph', accent: value.accent ?? null }

        case 'publishedWorkflow':
        case 'listing':
            return { name: value.display_name, detail: value.name, icon: 'Graph', accent: value.accent ?? null }

        case 'skill':
            return { name: value.name, detail: null, icon: value.icon ?? Skill.DEFAULT_ICON, accent: value.accent ?? Skill.DEFAULT_ACCENT }
    }
}
