import tailwindcssForms from "@tailwindcss/forms";
import tailwindcssTypography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import plugin from "tailwindcss/plugin";
import tailwindcssAnimate from "tailwindcss-animate";

const PORT_TYPES = [
    "Message",
    "LanguageModel",
    "str",
    "Text",
    "number",
    "Integer",
    "Prompt",
    "Document",
    "Data",
    "Agent",
    "Tool",
    "unknown",
    "VectorStore",
    "Retriever",
    "Embeddings",
    "DataFrame",
    "Memory",
    "File",
    "Json"
];

const portColors = PORT_TYPES.reduce((acc, portType) => {
    acc[portType] = {
        DEFAULT: `var(--port-${portType})`,
        foreground: `var(--port-${portType}-foreground)`,
        accent: `var(--port-${portType}-accent)`,
    };
    return acc;
}, {} as Record<string, any>);

const config: Config = {

    darkMode: "class",
    content: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "./index.html",
        "./src/**/*.{js,ts,tsx,jsx}",
        "../standard-ui/src/**/*.{js,ts,tsx,jsx}",
    ],
    important: false,
    theme: {
        container: {
            center: true,
            screens: {
                "2xl": "1400px",
                "3xl": "1500px",
            },
        },
        extend: {
            screens: {
                xl: "1200px",
                "2xl": "1400px",
                "3xl": "1500px",
            },
            keyframes: {
                "spin-slow": {
                    from: { transform: "translate(-50%, -50%) rotate(0deg)" },
                    to: { transform: "translate(-50%, -50%) rotate(360deg)" },
                },
                neonPulse: {
                    '0%, 100%': {
                        boxShadow: '0 0 0 3px var(--node-ring), 0 0 8px currentColor, 0 0 16px currentColor'
                    },
                    '50%': {
                        boxShadow: '0 0 0 3px var(--node-ring), 0 0 12px currentColor, 0 0 24px currentColor'
                    }
                },
                // Accordion animations
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                // Overlay animations
                overlayShow: {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
                overlayHide: {
                    from: { opacity: "1" },
                    to: { opacity: "0" },
                },

                // Content animations - now including both scale and clip in one animation
                contentShow: {
                    from: {
                        opacity: "0",
                        transform: "translate(-50%, -50%) scale(0.95)",
                        clipPath: "inset(50% 0)",
                        boxShadow: "0 4px 8px -2px rgba(0, 0, 0, 0.1)", // Smaller shadow
                    },
                    to: {
                        opacity: "1",
                        transform: "translate(-50%, -50%) scale(1)",
                        clipPath: "inset(0% 0)",
                        boxShadow:
                            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    },
                },
                contentHide: {
                    from: {
                        opacity: "1",
                        transform: "translate(-50%, -50%) scale(1)",
                        clipPath: "inset(0% 0)",
                        boxShadow:
                            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    },
                    to: {
                        opacity: "0",
                        transform: "translate(-50%, -50%) scale(0.95)",
                        clipPath: "inset(50% 0)",
                        boxShadow: "0 4px 8px -2px rgba(0, 0, 0, 0.1)",
                    },
                },
                wiggle: {
                    "0%, 100%": { transform: "scale(100%)" },
                    "50%": { transform: "scale(120%)" },
                },
                "border-beam": {
                    "100%": {
                        "offset-distance": "100%",
                    },
                },
                "pulse-pink": {
                    "0%, 100%": { backgroundColor: "var(--accent-pink)" },
                    "50%": { backgroundColor: "color-mix(in srgb, var(--accent-pink) 40%, transparent)" },
                },
                "border-ping": {
                    "0%, 100%": { borderColor: "var(--destructive)", boxShadow: "0 0 6px 1px color-mix(in srgb, var(--destructive) 60%, transparent)" },
                    "50%": { borderColor: "color-mix(in srgb, var(--destructive) 20%, transparent)", boxShadow: "none" },
                },
                "bg-ping": {
                    "0%, 100%": { backgroundColor: "var(--destructive)", boxShadow: "0 0 6px 1px color-mix(in srgb, var(--destructive) 60%, transparent)" },
                    "50%": { backgroundColor: "color-mix(in srgb, var(--destructive) 20%, transparent)", boxShadow: "none" },
                },
                "ping-fixed-50": {
                    "0%": {
                        width: "100%",
                        height: "100%",
                        opacity: "0.95",
                    },
                    "70%": {
                        width: "calc(100% + 50px)",
                        height: "calc(100% + 50px)",
                        opacity: "0.5",
                    },
                    "80%": {
                        width: "calc(100% + 50px)",
                        height: "calc(100% + 50px)",
                        opacity: "0.2",
                    },
                    "100%": {
                        width: "calc(100% + 50px)",
                        height: "calc(100% + 50px)",
                        opacity: "0"
                    }
                },
                "ping-fixed-10": {
                    "0%": {
                        inset: "0px",
                        opacity: "0.95",
                    },
                    "70%": {
                        inset: "-15px",
                        opacity: "0.5",
                    },
                    "80%": {
                        inset: "-15px",
                        opacity: "0.2",
                    },
                    "100%": {
                        inset: "-15px",
                        opacity: "0"
                    }
                },
            },
            animation: {
                neonPulse: 'neonPulse 1.1s ease-in-out infinite',
                // Accordion animations
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                // Animation definitions
                overlayShow: "overlayShow 400ms cubic-bezier(0.16, 1, 0.3, 1)",
                overlayHide: "overlayHide 500ms cubic-bezier(0.16, 1, 0.3, 1)",
                contentShow: "contentShow 400ms cubic-bezier(0.16, 1, 0.3, 1)",
                contentHide: "contentHide 500ms cubic-bezier(0.16, 1, 0.3, 1)",
                wiggle: "wiggle 150ms ease-in-out 1",
                "pulse-pink": "pulse-pink 2s linear infinite",
                "border-ping": "border-ping 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "bg-ping": "bg-ping 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "ping-fixed-50": "ping-fixed-50 700ms linear infinite",
                "ping-fixed-10": "ping-fixed-10 700ms linear infinite",
                "slow-wiggle": "wiggle 500ms ease-in-out 1",
                "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
                "spin-slow": "spin-slow 1.5s linear infinite",
            },
            colors: {
                port: portColors,
                "frozen-blue": "rgba(128, 190, 219, 0.86)", // Custom blue color for the frozen effect
                "frosted-glass": "rgba(255, 255, 255, 0.8)", // Custom frosted glass effect
                "component-icon": "var(--component-icon)",
                "flow-icon": "var(--flow-icon)",
                "low-indigo": "var(--low-indigo)",
                "chat-send": "var(--chat-send)",
                connection: "var(--connection)",
                "almost-dark-gray": "var(--almost-dark-gray)",
                "almost-light-blue": "var(--almost-light-blue)",
                "almost-medium-gray": "var(--almost-medium-gray)",
                "almost-medium-green": "var(--almost-medium-green)",
                "almost-medium-red": "var(--almost-medium-red)",
                "btn-shadow": "var(--round-btn-shadow)",
                "build-trigger": "var(--build-trigger)",
                "chat-trigger": "var(--chat-trigger)",
                "chat-trigger-disabled": "var(--chat-trigger-disabled)",
                "dark-blue": "var(--dark-blue)",
                "dark-gray": "var(--dark-gray)",
                "dark-red": "var(--dark-red)",
                error: {
                    DEFAULT: "var(--error)",
                    background: "var(--error-background)",
                    foreground: "var(--error-foreground)",
                },
                "high-dark-gray": "var(--high-dark-gray)",
                "high-indigo": "var(--high-indigo)",
                "high-light-gray": "var(--high-light-gray)",
                "info-background": "var(--info-background)",
                "info-foreground": "var(--info-foreground)",
                "light-blue": "var(--light-blue)",
                "light-gray": "var(--light-gray)",
                "light-slate": "var(--light-slate)",
                "medium-blue": "var(--medium-blue)",
                "status-blue": "var(--status-blue)",
                "medium-dark-gray": "var(--medium-dark-gray)",
                "medium-dark-green": "var(--medium-dark-green)",
                "medium-dark-red": "var(--medium-dark-red)",
                "medium-emerald": "var(--medium-emerald)",
                "medium-gray": "var(--medium-gray)",
                "medium-high-indigo": "var(--medium-high-indigo)",
                "medium-indigo": "var(--medium-indigo)",
                "medium-low-gray": "var(--medium-low-gray)",
                "note-amber": "var(--note-amber)",
                "note-neutral": "var(--note-neutral)",
                "note-rose": "var(--note-rose)",
                "note-blue": "var(--note-blue)",
                "note-lime": "var(--note-lime)",
                "status-green": "var(--status-green)",
                "status-red": "var(--status-red)",
                "status-yellow": "var(--status-yellow)",
                "status-gray": "var(--status-gray)",
                warning: {
                    DEFAULT: "var(--warning)",
                    foreground: "var(--warning-foreground)",
                    text: "var(--warning-text)",
                },
                "success-background": "var(--success-background)",
                "success-foreground": "var(--success-foreground)",
                "accent-pink-foreground": "var(--accent-pink-foreground)",
                "accent-purple-foreground": "var(--accent-purple-foreground)",
                "accent-red-foreground": "var(--accent-red-foreground)",
                filter: {
                    foreground: "var(--filter-foreground)",
                    background: "var(--filter-background)",
                },
                beta: {
                    background: "var(--beta-background)",
                    foreground: "var(--beta-foreground)",
                    "foreground-soft": "var(--beta-foreground-soft)",
                },
                "chat-bot-icon": "var(--chat-bot-icon)",
                "chat-user-icon": "var(--chat-user-icon)",
                "code-background": "var(--code-background)",
                "code-description-background":
                    "var(--code-description-background)",
                "code-foreground": "var(--code-foreground)",
                canvas: {
                    DEFAULT: "var(--canvas)",
                    dot: "var(--canvas-dot)",
                },
                ice: "var(--ice)",
                selected: "var(--selected)",
                hover: "var(--hover)",
                border: "var(--border)",
                input: "var(--input)",
                ring: "var(--ring)",
                "error-red": "var(--error-red)",
                "error-red-border": "var(--error-red-border)",
                "node-selected": "var(--node-selected)",
                background: "var(--background)",
                foreground: "var(--foreground)",
                "emerald-smooth": "var(--emaral-smooth)",
                "emerald-hard": "var(--emeral-hard)",
                placeholder: "var(--placeholder)",
                "hard-zinc": "var(--hard-zinc)",
                "smooth-red": "var(--smooth-red)",
                "placeholder-foreground": "var(--placeholder-foreground)",
                primary: {
                    DEFAULT: "var(--primary)",
                    foreground: "var(--primary-foreground)",
                    hover: "var(--primary-hover)",
                    accent: "var(--primary-accent)"
                },
                secondary: {
                    DEFAULT: "var(--secondary)",
                    foreground: "var(--secondary-foreground)",
                    hover: "var(--secondary-hover)",
                },
                destructive: {
                    DEFAULT: "var(--destructive)",
                    foreground: "var(--destructive-foreground)",
                },
                muted: {
                    DEFAULT: "var(--muted)",
                    foreground: "var(--muted-foreground)",
                },
                accent: {
                    DEFAULT: "var(--accent)",
                    foreground: "var(--accent-foreground)",
                },
                "accent-amber": {
                    DEFAULT: "var(--accent-amber)",
                    foreground: "var(--accent-amber-foreground)",
                },
                "accent-emerald": {
                    DEFAULT: "var(--accent-emerald)",
                    foreground: "var(--accent-emerald-foreground)",
                    hover: "var(--accent-emerald-hover)",
                },
                "accent-indigo": {
                    DEFAULT: "var(--accent-indigo)",
                    foreground: "var(--accent-indigo-foreground)",
                },
                "accent-pink": {
                    DEFAULT: "var(--accent-pink)",
                    foreground: "var(--accent-pink-foreground)",
                },
                popover: {
                    DEFAULT: "var(--popover)",
                    foreground: "var(--popover-foreground)",
                },
                card: {
                    DEFAULT: "var(--card)",
                    float: "var(--card-float)",
                    foreground: "var(--card-foreground)",
                },
                tooltip: {
                    DEFAULT: "var(--tooltip)",
                    foreground: "var(--tooltip-foreground)",
                },
                "code-block": {
                    DEFAULT: "#18181B",
                    muted: "#27272A",
                },
                "datatype-yellow": {
                    DEFAULT: "var(--datatype-yellow)",
                    foreground: "var(--datatype-yellow-foreground)",
                },
                "datatype-blue": {
                    DEFAULT: "var(--datatype-blue)",
                    foreground: "var(--datatype-blue-foreground)",
                },
                "datatype-gray": {
                    DEFAULT: "var(--datatype-gray)",
                    foreground: "var(--datatype-gray-foreground)",
                },
                "datatype-lime": {
                    DEFAULT: "var(--datatype-lime)",
                    foreground: "var(--datatype-lime-foreground)",
                },
                "datatype-red": {
                    DEFAULT: "var(--datatype-red)",
                    foreground: "var(--datatype-red-foreground)",
                },
                "datatype-violet": {
                    DEFAULT: "var(--datatype-violet)",
                    foreground: "var(--datatype-violet-foreground)",
                },
                "datatype-emerald": {
                    DEFAULT: "var(--datatype-emerald)",
                    foreground: "var(--datatype-emerald-foreground)",
                },
                "datatype-fuchsia": {
                    DEFAULT: "var(--datatype-fuchsia)",
                    foreground: "var(--datatype-fuchsia-foreground)",
                },
                "datatype-purple": {
                    DEFAULT: "var(--datatype-purple)",
                    foreground: "var(--datatype-purple-foreground)",
                },
                "datatype-cyan": {
                    DEFAULT: "var(--datatype-cyan)",
                    foreground: "var(--datatype-cyan-foreground)",
                },
                "datatype-indigo": {
                    DEFAULT: "var(--datatype-indigo)",
                    foreground: "var(--datatype-indigo-foreground)",
                },
                "node-ring": "var(--node-ring)",
                "neon-fuschia": "var(--neon-fuschia)",
                "digital-orchid": "var(--digital-orchid)",
                "plasma-purple": "var(--plasma-purple)",
                "electric-blue": "var(--electric-blue)",
                "holo-frost": "var(--holo-frost)",
                "terminal-green": "var(--terminal-green)",
                "cosmic-void": "var(--cosmic-void)",
                "slider-input-border": "var(--slider-input-border)",
                "zinc-foreground": "var(--zinc-foreground)",
                "red-foreground": "var(--red-foreground)",
                "indigo-foreground": "var(--indigo-foreground)",
                "discord-color": "var(--discord-color)",
            },
            borderRadius: {
                lg: `var(--radius)`,
                md: `calc(var(--radius) - 2px)`,
                sm: "calc(var(--radius) - 4px)",
            },
            borderWidth: {
                1.75: "1.75px",
                1.5: "1.5px",
            },
            fontFamily: {
                sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
                mono: ["var(--font-mono)", ...defaultTheme.fontFamily.mono],
                chivo: ["var(--font-chivo)", ...defaultTheme.fontFamily.sans],
            },
            boxShadow: {
                "selected": "0px 0px 8px 2px var(--tw-shadow-color)",
                "frozen-ring": "0 0 10px 2px rgba(128, 190, 230, 0.5)",
                node: "0 0px 15px -3px rgb(0 0 0 / 0.1), 0 0px 6px -4px rgb(0 0 0 / 0.1)",
                "frosted-ring": "0 0 10px 2px rgba(128, 190, 230, 0.7)",
            },
            backdropBlur: {
                xs: "2px",
            },
            zIndex: {
                60: "60",
                70: "70",
                80: "80",
                90: "90",
                100: "100",
                999: "999",
            },
            fontSize: {
                xxs: "11px",
                mmd: "13px",
            },
        },
    },

    plugins: [
        tailwindcssAnimate,
        tailwindcssForms({
            strategy: "class", // only generate classes
        }),
        plugin(({ addUtilities }) => {
            addUtilities({
                ".scrollbar-hide": {
                    /* IE and Edge */
                    "-ms-overflow-style": "none",
                    /* Firefox */
                    "scrollbar-width": "none",
                    /* Safari and Chrome */
                    "&::-webkit-scrollbar": {
                        display: "none",
                    },
                },
                ".gutter-stable": {
                    "scrollbar-gutter": "stable",
                },
                ".truncate-multiline": {
                    display: "-webkit-box",
                    "-webkit-line-clamp":
                        "3" /* Change this number to the number of lines you want to show */,
                    "-webkit-box-orient": "vertical",
                    overflow: "hidden",
                    "text-overflow": "ellipsis",
                },
                ".truncate-doubleline": {
                    display: "-webkit-box",
                    "-webkit-line-clamp":
                        "2" /* Change this number to the number of lines you want to show */,
                    "-webkit-box-orient": "vertical",
                    overflow: "hidden",
                    "text-overflow": "ellipsis",
                },
                ".word-break-break-word": {
                    wordBreak: "break-word",
                },
                ".arrow-hide": {
                    "&::-webkit-datatype-spin-button": {
                        "-webkit-appearance": "none",
                        margin: "0",
                    },
                    "&::-webkit-outer-spin-button": {
                        "-webkit-appearance": "none",
                        margin: "0",
                    },
                },
                ".password": {
                    "-webkit-text-security": "disc",
                    "font-family": "text-security-disc",
                },
                ".stop": {
                    "-webkit-animation-play-state": "paused",
                    "-moz-animation-play-state": "paused",
                    "animation-play-state": "paused",
                },
                ".custom-scroll": {
                    "&::-webkit-scrollbar": {
                        width: "8px",
                        height: "8px",
                    },
                    "&::-webkit-scrollbar-track": {
                        backgroundColor: "var(--muted)",
                    },
                    "&::-webkit-scrollbar-thumb": {
                        backgroundColor: "var(--border)",
                        borderRadius: "999px",
                    },
                    "&::-webkit-scrollbar-thumb:hover": {
                        backgroundColor: "var(--placeholder-foreground)",
                    },
                    "&::-webkit-scrollbar-corner": {
                        backgroundColor: "transparent",
                    },
                    cursor: "auto",
                },
                ".dark .theme-attribution .react-flow__attribution": {
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    padding: "0px 5px",
                },
                ".dark .theme-attribution .react-flow__attribution a": {
                    color: "black",
                },
                ".text-align-last-left": {
                    "text-align-last": "left",
                },
                ".text-align-last-right": {
                    "text-align-last": "right",
                },

                ".note-node-markdown": {
                    lineHeight: "1",
                    "& ul li::marker": {
                        color: "black",
                    },
                    "& ol li::marker": {
                        color: "black",
                    },
                    "& h1, & h2, & h3, & h4, & h5, & h6, & p, & ul, & ol": {
                        marginBottom: "0.25rem",
                    },
                },
            });
        }),
        tailwindcssTypography,

        plugin(({ addUtilities, theme }) => {
            const colors = theme("colors");

            const generateUtilities = (colors: any, prefix = "") => {
                return Object.keys(colors).reduce((acc, colorName) => {
                    const colorValue = colors[colorName];
                    const className = prefix ? `${prefix}-${colorName}` : colorName;

                    if (typeof colorValue === "string") {
                        acc[`.truncate-${className}`] = {
                            position: "relative",
                            overflow: "hidden",
                            pointerEvents: "none",
                            "&::after": {
                                content: '""',
                                position: "absolute",
                                inset: "0 0 0 0",
                                background: `linear-gradient(to right, transparent 80%, ${colorValue})`,
                            },
                        };
                    } else if (typeof colorValue === "object") {
                        // Use the DEFAULT value for the base class if it exists
                        if (colorValue.DEFAULT) {
                            acc[`.truncate-${className}`] = {
                                position: "relative",
                                overflow: "hidden",
                                pointerEvents: "none",
                                "&::after": {
                                    content: '""',
                                    position: "absolute",
                                    inset: "0 0 0 0",
                                    background: `linear-gradient(to right, transparent 80%, ${colorValue.DEFAULT})`,
                                },
                            };
                        }
                        // Recursively generate utilities for nested color objects
                        Object.assign(acc, generateUtilities(colorValue, className));
                    }

                    return acc;
                }, {} as Record<string, any>);
            };

            const newUtilities = generateUtilities(colors);

            addUtilities(newUtilities, ["responsive", "hover"]);
        }),
        plugin(({ addVariant }) => {
            addVariant("group-increment-hover", ":merge(.group-increment):hover &");
            addVariant("group-decrement-hover", ":merge(.group-decrement):hover &");
        }),
    ],
};

export default config;
