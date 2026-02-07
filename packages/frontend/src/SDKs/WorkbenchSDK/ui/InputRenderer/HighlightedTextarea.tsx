
import React, { useMemo } from 'react';
import { cn } from '@/vx-ui/utils/cn';

const VAR_REGEX = /\$\{[a-zA-Z0-9_]+\}/g;

interface HighlightedTextareaProps extends React.ComponentProps<"textarea"> {
}

export const HighlightedTextarea: React.FC<HighlightedTextareaProps> = ({ className, value, ...props }) => {
    const text = String(value || "");

    const highlights = useMemo(() => {
        // Regex to split by ${variable} capturing the delimiter
        const regex = /(\$\{[a-zA-Z0-9_]+\})/g;
        const parts = text.split(regex);

        return parts.map((part, index) => {
            if (part.match(regex)) {
                return (
                    <span key={index} className="bg-primary/20 py-0.5 rounded-sm text-primary font-medium z-0">
                        {part}
                    </span>
                );
            }
            return <span key={index}>{part}</span>;
        });
    }, [text]);

    // Definition of base styles that MUST match between backdrop and textarea
    // We use 'font-sans' and specific text sizes.
    // 'whitespace-pre-wrap' and 'break-words' are critical for matching wrapping.
    const typographyClasses = "font-sans text-base md:text-sm whitespace-pre-wrap break-words leading-snug";
    const paddingClasses = "px-3 py-2";

    return (
        <div
            className={cn(
                // Container styles mimicking the original Textarea component
                "relative grid w-full rounded-lg border border-input/70 shadow-xs transition-[color,box-shadow]",
                "bg-input/30",
                "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
                "min-h-16 field-sizing-content", // Allow auto-sizing
                className
            )}
        >
            {/* Backdrop Layer (Text & Highlights) */}
            <div
                aria-hidden="true"
                className={cn(
                    typographyClasses,
                    paddingClasses,
                    "col-start-1 row-start-1",
                    "pointer-events-none select-none",
                    "text-foreground", // The text color user sees
                    "bg-transparent"
                )}
            >
                {highlights}
                {/* Trailing newline fix */}
                {text.endsWith('\n') && <br />}
            </div>

            {/* Foreground Layer (Input & Caret) */}
            <textarea
                value={text}
                className={cn(
                    typographyClasses,
                    paddingClasses,
                    "col-start-1 row-start-1",
                    // Visuals
                    "bg-transparent text-transparent caret-foreground",
                    // Interaction
                    "resize-none outline-none border-none w-full h-full block",
                    "overflow-hidden" // Rely on container field-sizing-content
                )}
                spellCheck={false}
                autoCorrect="off"
                {...props}
            />
        </div>
    )
}
