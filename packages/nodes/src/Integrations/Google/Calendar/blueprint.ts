import {
    defineBlueprint,
    defineTool,
    defineField,
    defineOutput,
} from "@pretzel-graph/node-sdk";
import { GoogleCalendarOAuth } from "@pretzel-graph/nodes/Credentials/GoogleOAuth";


const sendUpdatesOptions = [
    { value: "none",         displayName: "Nobody"          },
    { value: "externalOnly", displayName: "External Guests" },
    { value: "all",          displayName: "All Guests"      },
] as const;


export const Blueprint = defineBlueprint({
    id:              "Integrations.Google.Calendar",
    credentials:     [GoogleCalendarOAuth],
    displayName:     "Google Calendar",
    description:     "Lists, creates and updates events on the connected Google Calendar.",
    icon:            "GoogleCalendar",
    accent:          "port-Data",
    proxyCompatible: true,
    toolCompatible:  true,

    fields: [
        defineField.ResourceLoader("calendar", "Calendar", {
            loaderId:     "calendars",
            placeholder:  "Primary calendar",
            initialValue: { mode: "manual", value: "primary" },
        }),
        defineField.MultiOption("resource", "Resource", {
            options: [
                { value: "list",     displayName: "List Events",  description: "Events in a time window, optionally matching a search." },
                { value: "get",      displayName: "Get Event",    description: "One event by id."                                     },
                { value: "create",   displayName: "Create Event", description: "Add an event, with optional guests."                  },
                { value: "update",   displayName: "Update Event", description: "Change fields on an existing event."                  },
                { value: "delete",   displayName: "Delete Event", description: "Remove an event."                                     },
                { value: "freeBusy", displayName: "Free / Busy",  description: "Busy intervals in a time window."                     },
            ],
            initialValue: "list",
        }),
    ],
    inputs:  [],
    outputs: [],


    "resource==list": {
        fields: [
            defineField.String("timeMin", "From", { placeholder: "2026-09-01T00:00:00Z", tooltip: "ISO 8601. Leave empty for now." }),
            defineField.String("timeMax", "To",   { placeholder: "2026-09-08T00:00:00Z", tooltip: "ISO 8601. Leave empty for no upper bound." }),
            defineField.String("query",   "Search", { tooltip: "Free-text match on title, description, location and guests." }),
            defineField.Integer("maxResults", "Max Results", { initialValue: 50, min: 1, max: 2500 }),
        ],
        outputs: [defineOutput.DataList("events", "Events")],
    },

    "resource==get": {
        fields: [
            defineField.String("eventId", "Event ID", { required: true }),
        ],
        outputs: [defineOutput.Data("event", "Event")],
    },

    "resource==create": {
        fields: [
            defineField.String("summary",     "Title", { required: true }),
            defineField.String("start",       "Start", { required: true, placeholder: "2026-09-01T10:00:00", tooltip: "ISO 8601 date-time, or YYYY-MM-DD for all day." }),
            defineField.String("end",         "End",   { required: true, placeholder: "2026-09-01T11:00:00" }),
            defineField.String("timeZone",    "Time Zone", { placeholder: "Europe/Bucharest", tooltip: "IANA name. Leave empty when start and end carry an offset." }),
            defineField.String("description", "Description"),
            defineField.String("location",    "Location"),
            defineField.List("attendees",     "Guests", { tooltip: "Email addresses." }),
            defineField.MultiOption("sendUpdates", "Notify", { options: sendUpdatesOptions, initialValue: "none" }),
        ],
        outputs: [defineOutput.Data("event", "Event")],
    },

    "resource==update": {
        fields: [
            defineField.String("updateEventId",    "Event ID", { required: true }),
            defineField.String("updateSummary",    "Title"),
            defineField.String("updateStart",      "Start", { placeholder: "2026-09-01T10:00:00" }),
            defineField.String("updateEnd",        "End",   { placeholder: "2026-09-01T11:00:00" }),
            defineField.String("updateTimeZone",   "Time Zone"),
            defineField.String("updateDescription", "Description"),
            defineField.String("updateLocation",   "Location"),
            defineField.List("updateAttendees",    "Guests", { tooltip: "Replaces the guest list when set." }),
            defineField.MultiOption("updateSendUpdates", "Notify", { options: sendUpdatesOptions, initialValue: "none" }),
        ],
        outputs: [defineOutput.Data("event", "Event")],
    },

    "resource==delete": {
        fields: [
            defineField.String("deleteEventId", "Event ID", { required: true }),
            defineField.MultiOption("deleteSendUpdates", "Notify", { options: sendUpdatesOptions, initialValue: "none" }),
        ],
        outputs: [defineOutput.Data("result", "Result")],
    },

    "resource==freeBusy": {
        fields: [
            defineField.String("busyTimeMin", "From", { required: true, placeholder: "2026-09-01T00:00:00Z" }),
            defineField.String("busyTimeMax", "To",   { required: true, placeholder: "2026-09-02T00:00:00Z" }),
        ],
        outputs: [defineOutput.Data("freeBusy", "Free / Busy")],
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [defineOutput.ToolList("tools", "Google Calendar Tools")],
    }),
});
