import { memo } from 'react';
import { Foundations } from "@pretzel-graph/shared/domain";

export type EdgeColorKey = Foundations.Port.Variant | 'selected' | 'destructive' | 'waiting';

const SPECIAL_COLORS: Partial<Record<EdgeColorKey, string>> = {
    selected: 'var(--secondary-foreground)',
    destructive: 'var(--destructive)',
    waiting: 'var(--status-waiting)',
};

export const edgeColor = (key: EdgeColorKey) => SPECIAL_COLORS[key] ?? `var(--port-${key})`;

export const edgeMarkerId = (key: EdgeColorKey) => `edge-arrow-${key}`;

const KEYS: EdgeColorKey[] = [...Foundations.Port.Variant.options, 'selected', 'destructive', 'waiting'];

/** One shared arrowhead marker per edge color, referenced by every edge via url(#edge-arrow-…). */
export const EdgeMarkerDefs = memo(() => (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
        <defs>
            {KEYS.map(key => (
                <marker
                    key={key}
                    id={edgeMarkerId(key)}
                    markerWidth="12"
                    markerHeight="12"
                    viewBox="-10 -10 20 20"
                    refX="0"
                    refY="0"
                    orient="auto-start-reverse"
                    markerUnits="strokeWidth"
                >
                    <polyline
                        points="-5,-4 0,0 -5,4 -5,-4"
                        fill={edgeColor(key)}
                        stroke={edgeColor(key)}
                    />
                </marker>
            ))}
        </defs>
    </svg>
));
