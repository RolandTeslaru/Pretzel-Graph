import * as GmailMod from "./gmail"
import * as SheetsMod from "./sheets"
import * as DriveMod from "./drive"
import * as CalendarMod from "./calendar"

export namespace Google {
    export import Gmail    = GmailMod.Gmail
    export import Sheets   = SheetsMod.Sheets
    export import Drive    = DriveMod.Drive
    export import Calendar = CalendarMod.Calendar
}
