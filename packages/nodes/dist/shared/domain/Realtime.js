"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Realtime = void 0;
const zod_1 = require("zod");
var Realtime;
(function (Realtime) {
    Realtime.Channel = zod_1.z.string().brand("Channel");
    let Event;
    (function (Event) {
        Event.Type = zod_1.z.string();
        Event.Base = zod_1.z.object({
            channel: Realtime.Channel,
            type: Event.Type,
        });
        let Forbidden;
        (function (Forbidden) {
            Forbidden.Schema = Event.Base.extend({
                type: zod_1.z.literal("forbidden"),
                message: zod_1.z.string(),
            });
        })(Forbidden = Event.Forbidden || (Event.Forbidden = {}));
    })(Event = Realtime.Event || (Realtime.Event = {}));
    let Signal;
    (function (Signal) {
        Signal.Type = zod_1.z.string();
        Signal.Base = zod_1.z.object({
            channel: Realtime.Channel,
            type: Signal.Type,
        });
    })(Signal = Realtime.Signal || (Realtime.Signal = {}));
})(Realtime || (exports.Realtime = Realtime = {}));
