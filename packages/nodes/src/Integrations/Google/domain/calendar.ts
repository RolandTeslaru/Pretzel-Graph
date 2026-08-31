import { z } from "zod"

export namespace Calendar {

    export const CalendarListEntry = z.looseObject({
        id:         z.string(),
        summary:    z.string().optional(),
        primary:    z.boolean().optional(),
        timeZone:   z.string().optional(),
        accessRole: z.string().optional(),
    })
    export type CalendarListEntry = z.infer<typeof CalendarListEntry>

    // Either an instant or an all-day date, never both.
    export const When = z.looseObject({
        dateTime: z.string().optional(),
        date:     z.string().optional(),
        timeZone: z.string().optional(),
    })
    export type When = z.infer<typeof When>

    export const Attendee = z.looseObject({
        email:          z.string(),
        displayName:    z.string().optional(),
        responseStatus: z.string().optional(),
        optional:       z.boolean().optional(),
    })

    export const Event = z.looseObject({
        id:               z.string(),
        status:           z.string().optional(),
        htmlLink:         z.string().optional(),
        summary:          z.string().optional(),
        description:      z.string().optional(),
        location:         z.string().optional(),
        start:            When.optional(),
        end:              When.optional(),
        attendees:        z.array(Attendee).optional(),
        organizer:        z.looseObject({ email: z.string().optional(), displayName: z.string().optional() }).optional(),
        hangoutLink:      z.string().optional(),
        recurringEventId: z.string().optional(),
        created:          z.string().optional(),
        updated:          z.string().optional(),
    })
    export type Event = z.infer<typeof Event>

    export const SendUpdates = z.enum(["all", "externalOnly", "none"])

    // What a node or tool supplies to create or change an event.
    export const EventInput = z.object({
        summary:     z.string().optional(),
        description: z.string().optional(),
        location:    z.string().optional(),
        // ISO 8601 instant, or YYYY-MM-DD for an all-day event.
        start:       z.string().optional(),
        end:         z.string().optional(),
        timeZone:    z.string().optional(),
        attendees:   z.array(z.string()).optional(),
    })
    export type EventInput = z.infer<typeof EventInput>

    export namespace API {

        export namespace Calendars {
            export namespace List {
                export const Request  = z.object({}).prefault({})
                export const Response = z.object({ items: z.array(CalendarListEntry) })
            }
        }

        export namespace Events {
            export namespace List {
                export const Request = z.object({
                    calendarId:   z.string().default("primary"),
                    timeMin:      z.string().optional(),
                    timeMax:      z.string().optional(),
                    q:            z.string().optional(),
                    maxResults:   z.number().int().min(1).max(2500).default(50),
                    singleEvents: z.boolean().default(true),
                    orderBy:      z.enum(["startTime", "updated"]).default("startTime"),
                    pageToken:    z.string().optional(),
                }).prefault({})
                export const Response = z.object({
                    items:         z.array(Event),
                    nextPageToken: z.string().optional(),
                })
            }

            export namespace Get {
                export const Request = z.object({
                    calendarId: z.string().default("primary"),
                    eventId:    z.string(),
                })
                export const Response = Event
            }

            export namespace Insert {
                export const Request = EventInput.extend({
                    calendarId:  z.string().default("primary"),
                    summary:     z.string(),
                    start:       z.string(),
                    end:         z.string(),
                    sendUpdates: SendUpdates.default("none"),
                })
                export const Response = Event
            }

            export namespace Patch {
                export const Request = EventInput.extend({
                    calendarId:  z.string().default("primary"),
                    eventId:     z.string(),
                    sendUpdates: SendUpdates.default("none"),
                })
                export const Response = Event
            }

            export namespace Delete {
                export const Request = z.object({
                    calendarId:  z.string().default("primary"),
                    eventId:     z.string(),
                    sendUpdates: SendUpdates.default("none"),
                })
                export const Response = z.object({ ok: z.literal(true) })
            }
        }

        export namespace FreeBusy {
            export namespace Query {
                export const Request = z.object({
                    timeMin:     z.string(),
                    timeMax:     z.string(),
                    calendarIds: z.array(z.string()).min(1).default(["primary"]),
                    timeZone:    z.string().optional(),
                })
                export const Response = z.object({
                    timeMin:   z.string().optional(),
                    timeMax:   z.string().optional(),
                    calendars: z.record(z.string(), z.looseObject({
                        busy: z.array(z.looseObject({ start: z.string(), end: z.string() })).default([]),
                    })),
                })
            }
        }
    }

    // A bare date is an all-day boundary; anything else is an instant.
    export function toWhen(value: string, timeZone?: string): When {
        return /^\d{4}-\d{2}-\d{2}$/.test(value)
            ? { date: value }
            : { dateTime: value, ...(timeZone ? { timeZone } : {}) }
    }

    export function toEventBody(input: EventInput): Record<string, unknown> {
        const body: Record<string, unknown> = {}

        if (input.summary     !== undefined) body.summary     = input.summary
        if (input.description !== undefined) body.description = input.description
        if (input.location    !== undefined) body.location    = input.location
        if (input.start       !== undefined) body.start       = toWhen(input.start, input.timeZone)
        if (input.end         !== undefined) body.end         = toWhen(input.end, input.timeZone)
        if (input.attendees   !== undefined) body.attendees   = input.attendees.map(email => ({ email }))

        return body
    }
}
