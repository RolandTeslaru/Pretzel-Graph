import { HumanReview } from "@pretzel-graph/shared/domain";
import { ExecutionSDK } from "../../../../ExecutionSDK/sdk";
import { ConsultationSDK } from "../../../sdk";
import { ConfirmationCard } from "./variants/ConfirmationCard";
import { ChoiceCard } from "./variants/ChoiceCard";
import { FormCard } from "./variants/FormCard";

type ConfirmRequest = Extract<HumanReview.Request, { variant: typeof HumanReview.Variant.Confirm }>
type ChoiceRequest  = Extract<HumanReview.Request, { variant: typeof HumanReview.Variant.Choice }>
type FormRequest    = Extract<HumanReview.Request, { variant: typeof HumanReview.Variant.Form }>

export interface ReviewCardProps extends ConsultationSDK.TemplateProps {
    request: HumanReview.Request
}

// One review request rendered into the consultation stack. The request comes in by value
// (never mutated after creation) so the card still renders its content while AnimatePresence
// plays the exit, after the session has already dropped it.
export const ReviewCard = ({ request, ...templateProps }: ReviewCardProps) => {
    return (
        <ConsultationSDK.Template
            {...templateProps}
            timeout={{
                createdAt: request.startedAt,
                timeoutMs: request.timeoutMs,
                onExpire:  () => ExecutionSDK.actions.pendingConsultations.remove(request.id),
            }}
        >
            <div className="p-2.5 text-white dark:text-black gap-3 flex flex-col">
                <div className="font-semibold">{request.title}</div>
                {request.message && <div className="text-xs opacity-70">{request.message}</div>}

                {/* Casts because the discriminant is `"tag" & Brand`, an intersection rather
                    than a unit type — so `===` doesn't narrow the union. See note below. */}
                {request.variant === HumanReview.Variant.Confirm && <ConfirmationCard request={request as ConfirmRequest} />}
                {request.variant === HumanReview.Variant.Choice  && <ChoiceCard request={request as ChoiceRequest} />}
                {request.variant === HumanReview.Variant.Form    && <FormCard request={request as FormRequest} />}
            </div>
        </ConsultationSDK.Template>
    )
}
