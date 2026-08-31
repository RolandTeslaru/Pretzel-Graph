import { tool } from "@langchain/core/tools";
import { ToolBudget } from "@pretzel-graph/node-sdk";
import { z } from "zod/v3";

import type { GoogleCalendarClient } from "../client";
import type { Google } from "../domain";


const compact = (e: Google.Calendar.Event) => ({
    id:          e.id,
    summary:     e.summary,
    start:       e.start?.dateTime ?? e.start?.date,
    end:         e.end?.dateTime ?? e.end?.date,
    location:    e.location,
    status:      e.status,
    attendees:   e.attendees?.map(a => `${a.email}${a.responseStatus ? ` (${a.responseStatus})` : ""}`),
    htmlLink:    e.htmlLink,
});

const calendarParam = z.string().default("primary").describe("Calendar id. 'primary' is the account's main calendar.");
const whenParam     = (what: string) => z.string().describe(`${what} as ISO 8601 date-time, or YYYY-MM-DD for an all-day event.`);


export function buildTools(calendar: GoogleCalendarClient) {

    const listCalendars = tool(
        async () => {
            const { items } = await calendar.calendars.list();

            return ToolBudget.list("calendars", items.map(c => ({ id: c.id, summary: c.summary, primary: c.primary, timeZone: c.timeZone })));
        },
        {
            name:        "calendar_list_calendars",
            description: "List the calendars the connected account can see, with their ids.",
            schema: z.object({}),
        },
    );

    const listEvents = tool(
        async ({ calendarId, timeMin, timeMax, query, maxResults }) => {
            const { items } = await calendar.events.list({ calendarId, timeMin, timeMax, q: query, maxResults });

            return ToolBudget.list("events", items.map(compact), { hint: "Narrow the time window." });
        },
        {
            name:        "calendar_list_events",
            description: "List events in a time window, ordered by start time. Recurring events are expanded into instances.",
            schema: z.object({
                calendarId: calendarParam,
                timeMin:    z.string().optional().describe("ISO 8601 lower bound. Omit for now."),
                timeMax:    z.string().optional().describe("ISO 8601 upper bound."),
                query:      z.string().optional().describe("Free-text filter."),
                maxResults: z.number().int().min(1).max(250).default(25),
            }),
        },
    );

    const getEvent = tool(
        async ({ calendarId, eventId }) => ToolBudget.value(await calendar.events.get({ calendarId, eventId })),
        {
            name:        "calendar_get_event",
            description: "Full details of one event.",
            schema: z.object({ calendarId: calendarParam, eventId: z.string() }),
        },
    );

    const createEvent = tool(
        async ({ calendarId, sendUpdates, ...input }) => ToolBudget.value(
            compact(await calendar.events.insert({ calendarId, sendUpdates, ...input })),
        ),
        {
            name:        "calendar_create_event",
            description: "Create an event. Guests are email addresses; set sendUpdates to 'all' to invite them.",
            schema: z.object({
                calendarId:  calendarParam,
                summary:     z.string(),
                start:       whenParam("Start"),
                end:         whenParam("End"),
                timeZone:    z.string().optional().describe("IANA zone when start/end have no offset."),
                description: z.string().optional(),
                location:    z.string().optional(),
                attendees:   z.array(z.string()).optional(),
                sendUpdates: z.enum(["all", "externalOnly", "none"]).default("none"),
            }),
        },
    );

    const updateEvent = tool(
        async ({ calendarId, eventId, sendUpdates, ...input }) => ToolBudget.value(
            compact(await calendar.events.patch({ calendarId, eventId, sendUpdates, ...input })),
        ),
        {
            name:        "calendar_update_event",
            description: "Change fields on an existing event. Only the fields given are changed.",
            schema: z.object({
                calendarId:  calendarParam,
                eventId:     z.string(),
                summary:     z.string().optional(),
                start:       whenParam("New start").optional(),
                end:         whenParam("New end").optional(),
                timeZone:    z.string().optional(),
                description: z.string().optional(),
                location:    z.string().optional(),
                attendees:   z.array(z.string()).optional().describe("Replaces the guest list."),
                sendUpdates: z.enum(["all", "externalOnly", "none"]).default("none"),
            }),
        },
    );

    const deleteEvent = tool(
        async ({ calendarId, eventId, sendUpdates }) => ToolBudget.value(await calendar.events.delete({ calendarId, eventId, sendUpdates })),
        {
            name:        "calendar_delete_event",
            description: "Delete an event.",
            schema: z.object({
                calendarId:  calendarParam,
                eventId:     z.string(),
                sendUpdates: z.enum(["all", "externalOnly", "none"]).default("none"),
            }),
        },
    );

    const freeBusy = tool(
        async ({ calendarIds, timeMin, timeMax }) => ToolBudget.value(await calendar.freeBusy.query({ calendarIds, timeMin, timeMax })),
        {
            name:        "calendar_free_busy",
            description: "Busy intervals for one or more calendars in a time window. Gaps between them are free.",
            schema: z.object({
                calendarIds: z.array(z.string()).min(1).default(["primary"]),
                timeMin:     z.string().describe("ISO 8601."),
                timeMax:     z.string().describe("ISO 8601."),
            }),
        },
    );

    return [listCalendars, listEvents, getEvent, createEvent, updateEvent, deleteEvent, freeBusy];
}
