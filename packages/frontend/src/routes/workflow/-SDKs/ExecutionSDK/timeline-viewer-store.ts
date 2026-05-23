import { immer } from "zustand/middleware/immer"
import { createWithEqualityFn } from "zustand/traditional"
import { shallow } from "zustand/shallow"
import { Recording } from "@pretzel-graph/shared/domain"
import { VIEW_MODES, type TimelineViewMode } from "./ui/Timeline/time-scale"

export type TimelineViewerState = {
    zoom: number
    selectedUoW: Recording.UnitOfWork.Id | null
    showRemnants: boolean
    viewMode: TimelineViewMode
}

export const timelineViewerReducers = {
    setZoom: (s: TimelineViewerState, zoom: number) => {
        s.zoom = Math.min(10, Math.max(0.02, zoom));
    },
    setSelectedUoW: (s: TimelineViewerState, id: Recording.UnitOfWork.Id | null) => {
        s.selectedUoW = id;
    },
    toggleRemnants: (s: TimelineViewerState) => {
        s.showRemnants = !s.showRemnants;
    },
    setViewMode: (s: TimelineViewerState, mode: TimelineViewMode) => {
        s.viewMode = mode;
    },
    toggleViewMode: (s: TimelineViewerState) => {
        const i = VIEW_MODES.indexOf(s.viewMode);
        s.viewMode = VIEW_MODES[(i + 1) % VIEW_MODES.length];
    },
}

export const useTimelineViewerStore = createWithEqualityFn(
    immer<TimelineViewerState>(() => ({
        zoom: 0.2,
        selectedUoW: null,
        showRemnants: true,
        viewMode: "linear",
    })),
    shallow
)

export const timelineViewerActions = {
    setZoom: (zoom: number) => {
        useTimelineViewerStore.setState(s => { timelineViewerReducers.setZoom(s, zoom) })
    },
    selectUoW: (id: Recording.UnitOfWork.Id | null) => {
        useTimelineViewerStore.setState(s => { timelineViewerReducers.setSelectedUoW(s, id) })
    },
    toggleRemnants: () => {
        useTimelineViewerStore.setState(s => { timelineViewerReducers.toggleRemnants(s) })
    },
    setViewMode: (mode: TimelineViewMode) => {
        useTimelineViewerStore.setState(s => { timelineViewerReducers.setViewMode(s, mode) })
    },
    toggleViewMode: () => {
        useTimelineViewerStore.setState(s => { timelineViewerReducers.toggleViewMode(s) })
    },
}

export type TimelineViewerReducers = typeof timelineViewerReducers
export type TimelineViewerActions = typeof timelineViewerActions
