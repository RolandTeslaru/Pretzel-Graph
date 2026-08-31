import type { HTTP } from "@pretzel-graph/node-sdk"

import { withAPIParsing } from "../../../utils"
import { Google } from "../domain"
import { GoogleClient, encodeSegment, type AccessTokenGetter } from "./common"

export const CALENDAR_BASE_URL = "https://www.googleapis.com/calendar/v3"

const Calendar = Google.Calendar

export class GoogleCalendarClient extends GoogleClient {

    constructor(http: HTTP.ClientAPI, getToken: AccessTokenGetter) {
        super(http, CALENDAR_BASE_URL, getToken)
    }

    public readonly calendars = {
        list: withAPIParsing(
            Calendar.API.Calendars.List.Request,
            Calendar.API.Calendars.List.Response,
            () => this.get("/users/me/calendarList"),
        ),
    }

    public readonly events = {
        list: withAPIParsing(
            Calendar.API.Events.List.Request,
            Calendar.API.Events.List.Response,
            ({ calendarId, ...query }) => this.get(`/calendars/${encodeSegment(calendarId)}/events`, query),
        ),

        get: withAPIParsing(
            Calendar.API.Events.Get.Request,
            Calendar.API.Events.Get.Response,
            ({ calendarId, eventId }) => this.get(`/calendars/${encodeSegment(calendarId)}/events/${encodeSegment(eventId)}`),
        ),

        insert: withAPIParsing(
            Calendar.API.Events.Insert.Request,
            Calendar.API.Events.Insert.Response,
            ({ calendarId, sendUpdates, ...input }) => this.post(
                `/calendars/${encodeSegment(calendarId)}/events`,
                Calendar.toEventBody(input),
                { sendUpdates },
            ),
        ),

        patch: withAPIParsing(
            Calendar.API.Events.Patch.Request,
            Calendar.API.Events.Patch.Response,
            ({ calendarId, eventId, sendUpdates, ...input }) => this.patch(
                `/calendars/${encodeSegment(calendarId)}/events/${encodeSegment(eventId)}`,
                Calendar.toEventBody(input),
                { sendUpdates },
            ),
        ),

        delete: withAPIParsing(
            Calendar.API.Events.Delete.Request,
            Calendar.API.Events.Delete.Response,
            async ({ calendarId, eventId, sendUpdates }) => {
                await this.delete(`/calendars/${encodeSegment(calendarId)}/events/${encodeSegment(eventId)}`, { sendUpdates })

                return { ok: true }
            },
        ),
    }

    public readonly freeBusy = {
        query: withAPIParsing(
            Calendar.API.FreeBusy.Query.Request,
            Calendar.API.FreeBusy.Query.Response,
            ({ calendarIds, ...body }) => this.post("/freeBusy", {
                ...body,
                items: calendarIds.map(id => ({ id })),
            }),
        ),
    }
}
