import { HumanReview } from "@pretzel-graph/shared/domain";
import { InteractionSDK } from "../../../InteractionSDK";
import { HumanReviewSDK } from "../../sdk";
import { ConfirmationCard } from "./Cards/ConfirmationCard";
import { ChoiceCard } from "./Cards/ChoiceCard";
import { FormCard } from "./Cards/FormCard";

export interface ReviewCardProps extends InteractionSDK.TemplateProps {
    request: HumanReview.Request
}

// One review request rendered into the interaction stack. The request is passed by value
// (never mutated after creation) so the card still renders its content while AnimatePresence
// plays the exit, after the SDK has already dropped it.
export const ReviewCard = ({ request, ...templateProps }: ReviewCardProps) => {
    return (
        <InteractionSDK.Template
            {...templateProps}
            timeout={{
                createdAt: request.createdAt,
                timeoutMs: request.timeoutMs,
                onExpire:  () => HumanReviewSDK.actions.removeRequest(request.id),
            }}
        >
            <div className="p-2.5 text-white dark:text-black gap-3 flex flex-col">
                <div className="font-semibold">{request.title}</div>
                {request.message && <div className="text-xs opacity-70">{request.message}</div>}

                {request.variant === "confirm" && <ConfirmationCard request={request} />}
                {request.variant === "choice"  && <ChoiceCard request={request} />}
                {request.variant === "form"    && <FormCard request={request} />}
            </div>
        </InteractionSDK.Template>
    )
}
