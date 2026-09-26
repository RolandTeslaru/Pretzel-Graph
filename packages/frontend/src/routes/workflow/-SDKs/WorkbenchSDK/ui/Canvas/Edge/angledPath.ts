import { Position } from '@xyflow/react';

type Point = { x: number, y: number };

interface AngledPathParams {
    sourceX:        number
    sourceY:        number
    sourcePosition: Position
    targetX:        number
    targetY:        number
    targetPosition: Position
    radius:         number
}

// Right-angled path between two side ports whose corners all share one radius, the ones at the ports included.
export function getAngledPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, radius }: AngledPathParams): [path: string, labelX: number, labelY: number] {
    const source = { x: sourceX, y: sourceY };
    const target = { x: targetX, y: targetY };

    const sourceDir = sourcePosition === Position.Right ? 1 : -1;
    const targetDir = targetPosition === Position.Right ? 1 : -1;

    const sourceStub = { x: sourceX + sourceDir * radius, y: sourceY };
    const targetStub = { x: targetX + targetDir * radius, y: targetY };

    let points: Point[];
    let label: Point;

    if (sourceDir === targetDir) {
        const outerX = sourceDir > 0
            ? Math.max(sourceStub.x, targetStub.x)
            : Math.min(sourceStub.x, targetStub.x);

        points = [source, { x: outerX, y: sourceY }, { x: outerX, y: targetY }, target];
        label = { x: outerX, y: (sourceY + targetY) / 2 };
    }
    else if ((targetStub.x - sourceStub.x) * sourceDir >= 0) {
        const middleX = (sourceX + targetX) / 2;

        points = [source, { x: middleX, y: sourceY }, { x: middleX, y: targetY }, target];
        label = { x: middleX, y: (sourceY + targetY) / 2 };
    }
    else {
        const middleY = (sourceY + targetY) / 2;

        points = [
            source,
            sourceStub,
            { x: sourceStub.x, y: middleY },
            { x: targetStub.x, y: middleY },
            targetStub,
            target,
        ];
        label = { x: (sourceStub.x + targetStub.x) / 2, y: middleY };
    }

    return [roundCorners(dropRepeats(points), radius), label.x, label.y];
}

// A corner may use half of a segment it shares with another corner, and all of one that ends at a port.
function roundCorners(points: Point[], radius: number): string {
    const last = points.length - 1;
    let path = `M ${points[0].x},${points[0].y}`;

    for (let i = 1; i < last; i++) {
        const before = points[i - 1];
        const corner = points[i];
        const after  = points[i + 1];

        const beforeRoom = distance(before, corner) / (i - 1 === 0 ? 1 : 2);
        const afterRoom  = distance(corner, after) / (i + 1 === last ? 1 : 2);
        const bend       = Math.min(radius, beforeRoom, afterRoom);

        const entry = stepToward(corner, before, bend);
        const exit  = stepToward(corner, after, bend);

        path += ` L ${entry.x},${entry.y} Q ${corner.x},${corner.y} ${exit.x},${exit.y}`;
    }

    return `${path} L ${points[last].x},${points[last].y}`;
}

function dropRepeats(points: Point[]): Point[] {
    return points.filter((point, i) => i === 0 || distance(point, points[i - 1]) > 0);
}

function stepToward(from: Point, to: Point, length: number): Point {
    const total = distance(from, to);

    if (total === 0)
        return from;

    return {
        x: from.x + (to.x - from.x) * (length / total),
        y: from.y + (to.y - from.y) * (length / total),
    };
}

function distance(a: Point, b: Point): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
