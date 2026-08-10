import { HumanReview } from "@pretzel-graph/shared/domain";
import { Button, Input, Spinner } from "@pretzel-graph/standard-ui/foundations";
import { SystemIcons } from "@pretzel-graph/standard-ui/icons";
import { useState } from "react";
import { HumanReviewSDK } from "../../../sdk";

type ChoiceRequest = Extract<HumanReview.Request, { variant: "choice" }>;

// Pick one (or many) of the offered options → Data port.
export const ChoiceCard = ({ request }: { request: ChoiceRequest }) => {
    
    const multiChoice = request.multiple
    const allowCustom = request.allowCustom

    const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
    const [customOption, setCustomOption] = useState<string>("");
    const [sending, setSending] = useState(false);

    const handleSelect = (option: string) => {
        if (multiChoice) {
            setSelectedOptions(prev => {
                const newSet = new Set(prev);
                if (newSet.has(option)) {
                    newSet.delete(option);
                } else {
                    newSet.add(option);
                }
                return newSet;
            });
        } else {
            setSelectedOptions(new Set([option]));
        }
    }

    const handleOnSend = async () => {
        const values = [...selectedOptions];

        if (allowCustom && customOption.trim())
            values.push(customOption.trim());

        if (values.length === 0)
            return;

        // Awaits the worker's confirmation (the resolve route returns once consumed); the card
        // is then removed by Event.Resolved, so we don't reset `sending` on success.
        setSending(true);
        try {
            await HumanReviewSDK.actions.respond(request.id, { variant: "choice", values });
        } finally {
            setSending(false);
        }
    }

    return (
        <>
            <div className="grid grid-cols-2 gap-2">
                {request.options.map((opt, i) => (
                    <Button
                        key={i}
                        variant="ghost"
                        className={`
                            ${selectedOptions.has(opt.value) && "bg-sky-500/30! hover:bg-sky-500/40!"} 
                            bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20 
                            text-sm font-medium text-white dark:text-black hover:text-white dark:hover:text-black px-2 py-1 rounded-xl`}
                        onClick={() => handleSelect(opt.value)}
                    >
                        {opt.label}
                    </Button>
                ))}
            </div>
            {allowCustom && (
                <Input variant="ghost-no-focus" placeholder="Enter custom option..." value={customOption} onChange={(e) => setCustomOption(e.target.value)} />
            )}
            <Button variant="ghost" disabled={sending} className="bg-sky-500 hover:bg-sky-600 dark:hover:bg-sky-600 text-sm font-medium text-white  hover:text-white  px-2 py-1 rounded-xl" onClick={handleOnSend}>
                {sending
                    ? <Spinner className="w-4 h-4" />
                    : <>{request.sendLabel ?? "Send"} <SystemIcons.ArrowRight className="w-4 h-4 ml-1" /></>}
            </Button>
        
        </>
    );
}
