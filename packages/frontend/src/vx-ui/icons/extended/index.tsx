import React from "react"
import { BaseIcon, BaseIconProps } from "../baseIcon"

export const HardDrive: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><path d="M22 12H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11zM6 16h.01M10 16h.01"></path></BaseIcon>
)
HardDrive.displayName = "HardDrive"

export const Server: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><rect width="20" height="8" x="2" y="2" rx="2" ry="2"></rect><rect width="20" height="8" x="2" y="14" rx="2" ry="2"></rect><path d="M6 6h.01M6 18h.01"></path></BaseIcon>
)
Server.displayName = "Server"


export const Sun: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></BaseIcon>
)
Sun.displayName = "Sun"


export const Sunset: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><path d="M17 18a5 5 0 00-10 0M12 9V2M4.22 10.22l1.42 1.42M1 18h2M21 18h2M18.36 11.64l1.42-1.42M23 22H1M16 5l-4 4-4-4"></path></BaseIcon>
)
Sunset.displayName = "Sunset"


export const Video: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><path d="M23 7l-7 5 7 5V7z"></path><rect width="15" height="14" x="1" y="5" rx="2" ry="2"></rect></BaseIcon>
)
Video.displayName = "Video"


export const Engine: React.FC<BaseIconProps> = (props) => (
    <BaseIcon viewBox="0 0 256 256" fill="currentColor" stroke="none" {...props}>
        <path d="M240,104H227.31L192,68.69A15.86,15.86,0,0,0,180.69,64H140V40h24a8,8,0,0,0,0-16H100a8,8,0,0,0,0,16h24V64H64A16,16,0,0,0,48,80v52H24V108a8,8,0,0,0-16,0v64a8,8,0,0,0,16,0V148H48v20.69A15.86,15.86,0,0,0,52.69,180L92,219.31A15.86,15.86,0,0,0,103.31,224h77.38A15.86,15.86,0,0,0,192,219.31L227.31,184H240a16,16,0,0,0,16-16V120A16,16,0,0,0,240,104Zm0,64H224a8,8,0,0,0-5.66,2.34L180.69,208H103.31L64,168.69V80H180.69l37.65,37.66A8,8,0,0,0,224,120h16Z"></path>
    </BaseIcon>
)
Engine.displayName = "Engine"


export const Display: React.FC<BaseIconProps> = (props) => (
    <BaseIcon viewBox="0 0 256 256" fill="currentColor" stroke="none" {...props}>
        <path d="M208,40H48A24,24,0,0,0,24,64V176a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V64A24,24,0,0,0,208,40Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8Zm-48,48a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,224Z"></path>
    </BaseIcon>
)
Display.displayName = "Display"


export const Film: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><rect width="20" height="20" x="2" y="2" rx="2.2" ry="2.2"></rect><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"></path></BaseIcon>
)
Film.displayName = "Film"


export const Material: React.FC<BaseIconProps> = (props) => (
    <BaseIcon {...props}><circle cx="12" cy="12" r="10" fill=""></circle><path stroke="" d="M12 16v-4M12 8h.01"></path></BaseIcon>
)
Material.displayName = "Material"




export const Bot: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></BaseIcon>
)
Bot.displayName = "Bot"


export const Database: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" /></BaseIcon>
)
Database.displayName = "Database"


export const Health: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M7.828 13.07A3 3 0 0 1 12 8.764a3 3 0 0 1 4.172 4.306l-3.447 3.62a1 1 0 0 1-1.449 0z" /></BaseIcon>
)
Health.displayName = "Health"


export const Heart: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={0.5} {...props}><path fillRule="evenodd" clipRule="evenodd" d="M12.0122 5.57169L10.9252 4.48469C8.77734 2.33681 5.29493 2.33681 3.14705 4.48469C0.999162 6.63258 0.999162 10.115 3.14705 12.2629L11.9859 21.1017L11.9877 21.0999L12.014 21.1262L20.8528 12.2874C23.0007 10.1395 23.0007 6.65711 20.8528 4.50923C18.705 2.36134 15.2226 2.36134 13.0747 4.50923L12.0122 5.57169ZM11.9877 18.2715L16.9239 13.3352L18.3747 11.9342L18.3762 11.9356L19.4386 10.8732C20.8055 9.50635 20.8055 7.29028 19.4386 5.92344C18.0718 4.55661 15.8557 4.55661 14.4889 5.92344L12.0133 8.39904L12.006 8.3918L12.005 8.39287L9.51101 5.89891C8.14417 4.53207 5.92809 4.53207 4.56126 5.89891C3.19442 7.26574 3.19442 9.48182 4.56126 10.8487L7.10068 13.3881L7.10248 13.3863L11.9877 18.2715Z" fill="currentColor" /></BaseIcon>
)
Heart.displayName = "Heart"



export const Table: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="M12 3v18" /><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /></BaseIcon>
)
Table.displayName = "Table"

export const Brush: React.FC<BaseIconProps> = (props) => (
    <BaseIcon viewBox="0 0 576 512" fill="currentColor" stroke="none" {...props}>
        <path d="M339.3 367.1c27.3-3.9 51.9-19.4 67.2-42.9L568.2 74.1c12.6-19.5 9.4-45.3-7.6-61.2S517.7-4.4 499.1 9.6L262.4 187.2c-24 18-38.2 46.1-38.4 76.1L339.3 367.1zm-19.6 25.4l-116-104.4C143.9 290.3 96 339.6 96 400c0 3.9 .2 7.8 .6 11.6C98.4 429.1 86.4 448 68.8 448L64 448c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0c61.9 0 112-50.1 112-112c0-2.5-.1-5-.2-7.5z" />
    </BaseIcon>
)
Brush.displayName = "Brush"


export const Box: React.FC<BaseIconProps> = (props) => (
    <BaseIcon size={15} {...props}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"></path><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"></path></BaseIcon>
)
Box.displayName = "Box"




export const Bookmark: React.FC<BaseIconProps> = (props) => (
    <BaseIcon strokeWidth={2} {...props}><path d="M3.5 2C3.22386 2 3 2.22386 3 2.5V13.5C3 13.6818 3.09864 13.8492 3.25762 13.9373C3.41659 14.0254 3.61087 14.0203 3.765 13.924L7.5 11.5896L11.235 13.924C11.3891 14.0203 11.5834 14.0254 11.7424 13.9373C11.9014 13.8492 12 13.6818 12 13.5V2.5C12 2.22386 11.7761 2 11.5 2H3.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></BaseIcon>
)
Bookmark.displayName = "Bookmark"


export const ExtendedIconsMap = {
    HardDrive,
    Server,
    Sun,
    Sunset,
    Video,
    Engine,
    Display,
    Film,
    Material,
    Bot,
    Database,
    Health,
    Heart,
    Table,
    Bookmark,
}
