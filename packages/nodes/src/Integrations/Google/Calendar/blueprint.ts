import {
    defineBlueprint,
    defineTool,
    FieldBuilder,
    OutputBuilder,
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
    icon:            "Google",
    accent:          "port-Data",
    proxyCompatible: true,
    toolCompatible:  true,

    fields: [
        FieldBuilder.ResourceLoader("calendar", "Calendar", {
            loaderId:     "calendars",
            placeholder:  "Primary calendar",
            initialValue: { mode: "manual", value: "primary" },
        }),
        FieldBuilder.MultiOption("resource", "Resource", {
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
            FieldBuilder.String("timeMin", "From", { placeholder: "2026-09-01T00:00:00Z", tooltip: "ISO 8601. Leave empty for now." }),
            FieldBuilder.String("timeMax", "To",   { placeholder: "2026-09-08T00:00:00Z", tooltip: "ISO 8601. Leave empty for no upper bound." }),
            FieldBuilder.String("query",   "Search", { tooltip: "Free-text match on title, description, location and guests." }),
            FieldBuilder.Integer("maxResults", "Max Results", { initialValue: 50, min: 1, max: 2500 }),
        ],
        outputs: [OutputBuilder.DataList("events", "Events")],
    },

    "resource==get": {
        fields: [
            FieldBuilder.String("eventId", "Event ID", { required: true }),
        ],
        outputs: [OutputBuilder.Data("event", "Event")],
    },

    "resource==create": {
        fields: [
            FieldBuilder.String("summary",     "Title", { required: true }),
            FieldBuilder.String("start",       "Start", { required: true, placeholder: "2026-09-01T10:00:00", tooltip: "ISO 8601 date-time, or YYYY-MM-DD for all day." }),
            FieldBuilder.String("end",         "End",   { required: true, placeholder: "2026-09-01T11:00:00" }),
            FieldBuilder.String("timeZone",    "Time Zone", { placeholder: "Europe/Bucharest", tooltip: "IANA name. Leave empty when start and end carry an offset." }),
            FieldBuilder.String("description", "Description"),
            FieldBuilder.String("location",    "Location"),
            FieldBuilder.List("attendees",     "Guests", { tooltip: "Email addresses." }),
            FieldBuilder.MultiOption("sendUpdates", "Notify", { options: sendUpdatesOptions, initialValue: "none" }),
        ],
        outputs: [OutputBuilder.Data("event", "Event")],
    },

    "resource==update": {
        fields: [
            FieldBuilder.String("updateEventId",    "Event ID", { required: true }),
            FieldBuilder.String("updateSummary",    "Title"),
            FieldBuilder.String("updateStart",      "Start", { placeholder: "2026-09-01T10:00:00" }),
            FieldBuilder.String("updateEnd",        "End",   { placeholder: "2026-09-01T11:00:00" }),
            FieldBuilder.String("updateTimeZone",   "Time Zone"),
            FieldBuilder.String("updateDescription", "Description"),
            FieldBuilder.String("updateLocation",   "Location"),
            FieldBuilder.List("updateAttendees",    "Guests", { tooltip: "Replaces the guest list when set." }),
            FieldBuilder.MultiOption("updateSendUpdates", "Notify", { options: sendUpdatesOptions, initialValue: "none" }),
        ],
        outputs: [OutputBuilder.Data("event", "Event")],
    },

    "resource==delete": {
        fields: [
            FieldBuilder.String("deleteEventId", "Event ID", { required: true }),
            FieldBuilder.MultiOption("deleteSendUpdates", "Notify", { options: sendUpdatesOptions, initialValue: "none" }),
        ],
        outputs: [OutputBuilder.Data("result", "Result")],
    },

    "resource==freeBusy": {
        fields: [
            FieldBuilder.String("busyTimeMin", "From", { required: true, placeholder: "2026-09-01T00:00:00Z" }),
            FieldBuilder.String("busyTimeMax", "To",   { required: true, placeholder: "2026-09-02T00:00:00Z" }),
        ],
        outputs: [OutputBuilder.Data("freeBusy", "Free / Busy")],
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Google Calendar Tools")],
    }),
});
