import React from "react"
import { BaseIcon, type BaseIconProps } from "./baseIcon"

export const AlertTriangle: React.FC<BaseIconProps> = (props) => (
    <BaseIcon viewBox="0 0 15 15" size={15} fill="currentColor" {...props}>
        <path fillRule="evenodd" clipRule="evenodd" d="M8.4449 0.608765C8.0183 -0.107015 6.9817 -0.107015 6.55509 0.608766L0.161178 11.3368C-0.275824 12.07 0.252503 13 1.10608 13H13.8939C14.7475 13 15.2758 12.07 14.8388 11.3368L8.4449 0.608765ZM7.4141 1.12073C7.45288 1.05566 7.54712 1.05566 7.5859 1.12073L13.9798 11.8488C14.0196 11.9154 13.9715 12 13.8939 12H1.10608C1.02849 12 0.980454 11.9154 1.02018 11.8488L7.4141 1.12073ZM6.8269 4.48611C6.81221 4.10423 7.11783 3.78663 7.5 3.78663C7.88217 3.78663 8.18778 4.10423 8.1731 4.48612L8.01921 8.48701C8.00848 8.766 7.7792 8.98664 7.5 8.98664C7.2208 8.98664 6.99151 8.766 6.98078 8.48701L6.8269 4.48611ZM8.24989 10.476C8.24989 10.8902 7.9141 11.226 7.49989 11.226C7.08567 11.226 6.74989 10.8902 6.74989 10.476C6.74989 10.0618 7.08567 9.72599 7.49989 9.72599C7.9141 9.72599 8.24989 10.0618 8.24989 10.476Z" />
    </BaseIcon>
)
AlertTriangle.displayName = "AlertTriangle"

export const ArrowLeft: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><path d="M19 12H5M12 19l-7-7 7-7"></path></BaseIcon>
)
ArrowLeft.displayName = "ArrowLeft"
export const ArrowRight: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><path d="M5 12h14M12 5l7 7-7 7"></path></BaseIcon>
)
ArrowRight.displayName = "ArrowRight"
export const ArrowUp: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><path d="M12 19V5M5 12l7-7 7 7"></path></BaseIcon>
)
ArrowUp.displayName = "ArrowUp"
export const ArrowDown: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><path d="M12 5v14M19 12l-7 7-7-7"></path></BaseIcon>
)
ArrowDown.displayName = "ArrowDown"
export const ChevronLeft: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><path d="M15 18l-6-6 6-6"></path></BaseIcon>
)
ChevronLeft.displayName = "ChevronLeft"
export const ChevronRight: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><path d="M9 18l6-6-6-6"></path></BaseIcon>
)
ChevronRight.displayName = "ChevronRight"
export const ChevronDown: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="m6 9 6 6 6-6" /></BaseIcon>
)
ChevronDown.displayName = "ChevronDown"
export const ChevronUp: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="m18 15-6-6-6 6" /></BaseIcon>
)
ChevronUp.displayName = "ChevronUp"
export const ChevronsLeft: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></BaseIcon>
)
ChevronsLeft.displayName = "ChevronsLeft"
export const ChevronsRight: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="m6 17 5-5-5-5" /><path d="m13 17 5-5-5-5" /></BaseIcon>
)
ChevronsRight.displayName = "ChevronsRight"
export const Check: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="M20 6 9 17l-5-5" /></BaseIcon>
)
Check.displayName = "Check"
export const Move: React.FC<BaseIconProps> = (props) => (
    <BaseIcon size={15} {...props}><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"></path></BaseIcon>
)
Move.displayName = "Move"

export const Maximize2: React.FC<BaseIconProps> = (props) => (
    <BaseIcon size={15} {...props}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></BaseIcon>
)
Maximize2.displayName = "Maximize2"



export const Minimize2: React.FC<BaseIconProps> = (props) => (
    <BaseIcon size={15} {...props}><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"></path></BaseIcon>
)




export const Globe: React.FC<BaseIconProps> = (props) => (
    <BaseIcon size={15} {...props}><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"></path></BaseIcon>
)
Globe.displayName = "Globe"


export const SkipForward: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><path d="M5 4l10 8-10 8V4zM19 5v14"></path></BaseIcon>
)
SkipForward.displayName = "SkipForward"


export const SkipBack: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><path d="M19 20L9 12l10-8v16zM5 19V5"></path></BaseIcon>
)
SkipBack.displayName = "SkipBack"


export const Pause: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><path fill="" d="M6 4h4v16H6zM14 4h4v16h-4z"></path></BaseIcon>
)
Pause.displayName = "Pause"


export const PauseFill: React.FC<BaseIconProps> = (props) => (
    <BaseIcon fill="currentColor" stroke="none" {...props}><path d="M6 4h4v16H6zM14 4h4v16h-4z"></path></BaseIcon>
)
PauseFill.displayName = "PauseFill"


export const Play: React.FC<BaseIconProps> = (props) => (
    <BaseIcon fill="currentColor" stroke="none" {...props}><path d="M5 3l14 9-14 9V3z"></path></BaseIcon>
)
Play.displayName = "Play"


export const Square: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect></BaseIcon>
)
Square.displayName = "Square"


export const Info: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><circle cx="12" cy="12" r="10" fill=""></circle><path stroke="" d="M12 16v-4M12 8h.01"></path></BaseIcon>
)
Info.displayName = "Info"


export const X: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={3} {...props}><path d="M18 6L6 18M6 6l12 12"></path></BaseIcon>
)
X.displayName = "X"

export const RefreshCcw: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><path d="M1 4v6h6M23 20v-6h-6"></path><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"></path></BaseIcon>
)
RefreshCcw.displayName = "RefreshCcw"
export const Lambda: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><path d="M6.998 3.5c-.216 0-.364.142-.364.314 0 .171.146.315.337.315l.228.002c.902.016 1.41.135 1.833.437.416.298.784.798 1.277 1.724l.227.44 1.591 3.543-.137.225-6.445 10.528a.299.299 0 00-.005.306c.057.1.167.164.288.166a.338.338 0 00.295-.158l6.334-10.347.392.852 3.042 6.627.496 1.126.11.236c.2.424.373.714.575.944.429.49.98.692 1.88.717l.182.004.08-.004a.321.321 0 00.286-.312c0-.17-.147-.314-.34-.314l-.193-.003c-.728-.02-1.094-.16-1.392-.501l-.06-.073a3.994 3.994 0 01-.41-.715c-.048-.1-.098-.208-.155-.336l-.447-1.017-3.696-8.052-1.662-3.698-.158-.31c-.574-1.103-1.016-1.714-1.553-2.098-.551-.396-1.19-.548-2.208-.566L6.998 3.5z"></path></BaseIcon>
)
Lambda.displayName = "Lambda"
export const Ellipsis: React.FC<BaseIconProps> = (props) => (
    <BaseIcon stroke="currentColor" fill="none" viewBox="0 0 576 512" {...props}>
        <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
    </BaseIcon>
)
Ellipsis.displayName = "Ellipsis"


export const Circle: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><circle cx="12" cy="12" r="10" /></BaseIcon>
)
Circle.displayName = "Circle"

export const Minus: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="M5 12h14" /></BaseIcon>
)
Minus.displayName = "Minus"


export const Plus: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="M5 12h14"/><path d="M12 5v14"/></BaseIcon>
)
Minus.displayName = "Plus"


export const Share: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={0.5} {...props}><path d="M18 9C19.6569 9 21 7.65685 21 6C21 4.34315 19.6569 3 18 3C16.3431 3 15 4.34315 15 6C15 6.12549 15.0077 6.24919 15.0227 6.37063L8.08261 9.84066C7.54305 9.32015 6.80891 9 6 9C4.34315 9 3 10.3431 3 12C3 13.6569 4.34315 15 6 15C6.80891 15 7.54305 14.6798 8.08261 14.1593L15.0227 17.6294C15.0077 17.7508 15 17.8745 15 18C15 19.6569 16.3431 21 18 21C19.6569 21 21 19.6569 21 18C21 16.3431 19.6569 15 18 15C17.1911 15 16.457 15.3202 15.9174 15.8407L8.97733 12.3706C8.99229 12.2492 9 12.1255 9 12C9 11.8745 8.99229 11.7508 8.97733 11.6294L15.9174 8.15934C16.457 8.67985 17.1911 9 18 9Z" fill="currentColor" /></BaseIcon>
)
Share.displayName = "Share"
export const Comment: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={0.5} {...props}><path d="M17 9H7V7H17V9Z" fill="currentColor" /><path d="M7 13H17V11H7V13Z" fill="currentColor" /><path fillRule="evenodd" clipRule="evenodd" d="M2 18V2H22V18H16V22H14C11.7909 22 10 20.2091 10 18H2ZM12 16V18C12 19.1046 12.8954 20 14 20V16H20V4H4V16H12Z" fill="currentColor" /></BaseIcon>
)
Comment.displayName = "Comment"

export const Download: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /></BaseIcon>
)
Download.displayName = "Download"
export const File: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /></BaseIcon>
)
File.displayName = "File"
export const Trash2: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></BaseIcon>
)
Trash2.displayName = "Trash2"
export const CircleCheck: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></BaseIcon>
)
CircleCheck.displayName = "CircleCheck"

export const Activity: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" /></BaseIcon>
)
Activity.displayName = "Activity"



export const CirclePlus: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></BaseIcon>
)
CirclePlus.displayName = "CirclePlus"
export const Sparkles: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path><path d="M20 3v4M22 5h-4M6 16v4M8 18H4"></path></BaseIcon>
)
Sparkles.displayName = "Sparkles"


export const EyeOff: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" /><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" /><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" /><path d="m2 2 20 20" /></BaseIcon>
)
EyeOff.displayName = "EyeOff"

export const Eye: React.FC<BaseIconProps> = (props) => (
    <BaseIcon size={20} strokeWidth={0.5} {...props}><path fillRule="evenodd" clipRule="evenodd" d="M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12ZM14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12Z" fill="currentColor" /><path fillRule="evenodd" clipRule="evenodd" d="M12 3C17.5915 3 22.2898 6.82432 23.6219 12C22.2898 17.1757 17.5915 21 12 21C6.40848 21 1.71018 17.1757 0.378052 12C1.71018 6.82432 6.40848 3 12 3ZM12 19C7.52443 19 3.73132 16.0581 2.45723 12C3.73132 7.94186 7.52443 5 12 5C16.4756 5 20.2687 7.94186 21.5428 12C20.2687 16.0581 16.4756 19 12 19Z" fill="currentColor" /></BaseIcon>
)
Eye.displayName = "Eye"


export const Calendar: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></BaseIcon>
)
Calendar.displayName = "Calendar"


export const Menu: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="M4 12h16" /><path d="M4 18h16" /><path d="M4 6h16" /></BaseIcon>
)
Menu.displayName = "Menu"


export const MailCheck: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
<path d="m16 19 2 2 4-4"/>
    </BaseIcon>
)
MailCheck.displayName = "MailCheck"

export const Archive: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>
    </BaseIcon>
)
Archive.displayName = "Archive"


export const Clock: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="10"/>
    </BaseIcon>
)
Clock.displayName = "Clock"
export const CalendarPlus: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M16 19h6"/><path d="M16 2v4"/><path d="M19 16v6"/><path d="M21 12.598V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8.5"/><path d="M3 10h18"/><path d="M8 2v4"/>
    </BaseIcon>
)
CalendarPlus.displayName = "CalendarPlus"

//  Filter
export const Filter: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M2 5h20"/><path d="M6 12h12"/><path d="M9 19h6"/>
    </BaseIcon>
)
Filter.displayName = "Filter"


export const Terminal: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M12 19h8"/><path d="m4 17 6-6-6-6"/>
    </BaseIcon>
)
Terminal.displayName = "Terminal"


export const Tag: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>
    </BaseIcon>
)
Tag.displayName = "Tag"

// Volume
export const VolumeX: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>
    </BaseIcon>
)
VolumeX.displayName = "VolumeX"


// User round x
export const UserRoundX: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M2 21a8 8 0 0 1 11.873-7"/><circle cx="10" cy="8" r="5"/><path d="m17 17 5 5"/><path d="m22 17-5 5"/>
    </BaseIcon>
)
UserRoundX.displayName = "UserRoundX"




// Copy
export const Copy: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </BaseIcon>
)
Copy.displayName = "Copy"

// Trash
export const Trash: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </BaseIcon>
)
Trash.displayName = "Trash"

// Bot
export const Bot: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
    </BaseIcon>
)
Bot.displayName = "Bot"

// Search
export const Search: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>
    </BaseIcon>
)
Search.displayName = "Search"

// Star
export const Star: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>
    </BaseIcon>
)
Star.displayName = "Star"

// Audio
export const Audio: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/>
    </BaseIcon>
)
Audio.displayName = "Audio"


// Bluetooth
export const Bluetooth: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="m7 7 10 10-5 5V2l5 5L7 17"/>
    </BaseIcon>
)
Bluetooth.displayName = "Bluetooth"

export const MoveVertical: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M12 2v20"/><path d="m8 18 4 4 4-4"/><path d="m8 6 4-4 4 4"/>
    </BaseIcon>
)
MoveVertical.displayName = "MoveVertical"

export const Folder: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
    </BaseIcon>
)
Folder.displayName = "Folder"

export const FolderOpen: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>
    </BaseIcon>
)
FolderOpen.displayName = "FolderOpen"

export const FileCode: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 12.5 8 15l2 2.5"/><path d="m14 12.5 2 2.5-2 2.5"/>
    </BaseIcon>
)
FileCode.displayName = "FileCode"

export const ShoppingBag: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M16 10a4 4 0 0 1-8 0"/><path d="M3.103 6.034h17.794"/><path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/>
    </BaseIcon>
)
ShoppingBag.displayName = "ShoppingBag"

export const Logout: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    </BaseIcon>
)
Logout.displayName = "Logout"

export const FileText: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
    </BaseIcon>
)
FileText.displayName = "FileText"

export const Monitor: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>
    </BaseIcon>
)
Monitor.displayName = "Monitor"

export const Moon: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>
    </BaseIcon>
)
Moon.displayName = "Moon"

export const Sun: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
    </BaseIcon>
)
Sun.displayName = "Sun"

export const Pallet: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
    </BaseIcon>
)
Pallet.displayName = "Pallet"

export const Layers: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>
    </BaseIcon>
)
Layers.displayName = "Layers"

export const Save: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>
    </BaseIcon>
)
Save.displayName = "Save"

export const FolderSearch: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M10.7 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v4.1"/><path d="m21 21-1.9-1.9"/><circle cx="17" cy="17" r="3"/>
    </BaseIcon>
)
FolderSearch.displayName = "FolderSearch"

export const MoveHorizontal: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="m18 8 4 4-4 4"/><path d="M2 12h20"/><path d="m6 8-4 4 4 4"/>
    </BaseIcon>
)
MoveHorizontal.displayName = "MoveHorizontal"


export const OctagonX: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="m15 9-6 6"/>
        <path d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z"/>
        <path d="m9 9 6 6"/>
    </BaseIcon>
)
OctagonX.displayName = "OctagonX"


export const GripVertical: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
    </BaseIcon>
)
GripVertical.displayName = "GripVertical"


export const LockClosed: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M5 4.63601C5 3.76031 5.24219 3.1054 5.64323 2.67357C6.03934 2.24705 6.64582 1.9783 7.5014 1.9783C8.35745 1.9783 8.96306 2.24652 9.35823 2.67208C9.75838 3.10299 10 3.75708 10 4.63325V5.99999H5V4.63601ZM4 5.99999V4.63601C4 3.58148 4.29339 2.65754 4.91049 1.99307C5.53252 1.32329 6.42675 0.978302 7.5014 0.978302C8.57583 0.978302 9.46952 1.32233 10.091 1.99162C10.7076 2.65557 11 3.57896 11 4.63325V5.99999H12C12.5523 5.99999 13 6.44771 13 6.99999V13C13 13.5523 12.5523 14 12 14H3C2.44772 14 2 13.5523 2 13V6.99999C2 6.44771 2.44772 5.99999 3 5.99999H4ZM3 6.99999H12V13H3V6.99999Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path>
    </BaseIcon>
)
LockClosed.displayName = "LockClosed"

export const Key: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>
    </BaseIcon>
)
Key.displayName = "Key"


export const KeyRound: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>
    </BaseIcon>
)
KeyRound.displayName = "KeyRound"

export const MessageSquare: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/>
    </BaseIcon>
)
MessageSquare.displayName = "MessageSquare"

export const MessagesSquare: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/><path d="M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1"/>
    </BaseIcon>
)
MessagesSquare.displayName = "MessagesSquare"


export const Type: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M12 4v16"/><path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/><path d="M9 20h6"/>
    </BaseIcon>
)
Type.displayName = "Type"

export const Cable: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}>
        <path d="M17 19a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1z"/><path d="M17 21v-2"/><path d="M19 14V6.5a1 1 0 0 0-7 0v11a1 1 0 0 1-7 0V10"/><path d="M21 21v-2"/><path d="M3 5V3"/><path d="M4 10a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2z"/><path d="M7 5V3"/>
    </BaseIcon>
)
Cable.displayName = "Cable"


export const Vault: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={1} {...props}>
        <rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/><path d="m7.9 7.9 2.7 2.7"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/><path d="m13.4 10.6 2.7-2.7"/><circle cx="7.5" cy="16.5" r=".5" fill="currentColor"/><path d="m7.9 16.1 2.7-2.7"/><circle cx="16.5" cy="16.5" r=".5" fill="currentColor"/><path d="m13.4 13.4 2.7 2.7"/><circle cx="12" cy="12" r="2"/>
    </BaseIcon>
)
Vault.displayName = "Vault"