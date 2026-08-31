import { RuntimeNode, defineLoaders, type InferOutputs } from "@pretzel-graph/node-sdk";

import { GoogleCalendarClient, bareHTTP } from "../client";
import { googleToken, loaderValue, optional } from "../shared";
import { Blueprint } from "./blueprint";
import { buildTools } from "./tools";


export class Node extends RuntimeNode<typeof Blueprint> {

    static loaders = defineLoaders<typeof Blueprint>()({

        async calendars({ credentials, credentialsAPI, searchQuery }) {
            const calendar = new GoogleCalendarClient(bareHTTP(), googleToken(credentialsAPI, credentials.googleCalendarOAuth, "Google Calendar"));

            const { items } = await calendar.calendars.list();
            const q = searchQuery?.toLowerCase() ?? "";

            return {
                options: items
                    .filter(c => !q || (c.summary ?? c.id).toLowerCase().includes(q))
                    .map(c => ({
                        label:       c.summary ?? c.id,
                        value:       c.id,
                        description: c.primary ? "Primary" : c.accessRole,
                    })),
            };
        },
    });


    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        const fields   = this.fieldValues;
        const calendar = this.calendar;

        if (fields.isConvertedToTool === true)
            return {
                tools: buildTools(calendar),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        const calendarId = loaderValue(fields.calendar) ?? "primary";

        switch (fields.resource) {

            case "list": {
                const { items } = await calendar.events.list({
                    calendarId,
                    timeMin:    optional(fields.timeMin) ?? new Date().toISOString(),
                    timeMax:    optional(fields.timeMax),
                    q:          optional(fields.query),
                    maxResults: fields.maxResults,
                });

                return { events: items } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            case "get":
                return {
                    event: await calendar.events.get({ calendarId, eventId: fields.eventId }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "create":
                return {
                    event: await calendar.events.insert({
                        calendarId,
                        summary:     fields.summary,
                        start:       fields.start,
                        end:         fields.end,
                        timeZone:    optional(fields.timeZone),
                        description: optional(fields.description),
                        location:    optional(fields.location),
                        attendees:   fields.attendees?.length ? fields.attendees : undefined,
                        sendUpdates: fields.sendUpdates,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "update":
                return {
                    event: await calendar.events.patch({
                        calendarId,
                        eventId:     fields.updateEventId,
                        summary:     optional(fields.updateSummary),
                        start:       optional(fields.updateStart),
                        end:         optional(fields.updateEnd),
                        timeZone:    optional(fields.updateTimeZone),
                        description: optional(fields.updateDescription),
                        location:    optional(fields.updateLocation),
                        attendees:   fields.updateAttendees?.length ? fields.updateAttendees : undefined,
                        sendUpdates: fields.updateSendUpdates,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "delete":
                return {
                    result: await calendar.events.delete({
                        calendarId,
                        eventId:     fields.deleteEventId,
                        sendUpdates: fields.deleteSendUpdates,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "freeBusy":
                return {
                    freeBusy: await calendar.freeBusy.query({
                        calendarIds: [calendarId],
                        timeMin:     fields.busyTimeMin,
                        timeMax:     fields.busyTimeMax,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        return {};
    }


    #calendar: GoogleCalendarClient | undefined;

    private get calendar(): GoogleCalendarClient {
        this.#calendar ??= new GoogleCalendarClient(
            this.httpClientFactory,
            googleToken(this.context.credentialsAPI, this.credentials.googleCalendarOAuth, "Google Calendar"),
        );

        return this.#calendar;
    }
}
