import { HumanReview } from "@pretzel-graph/shared/domain";
import { Button } from "@pretzel-graph/standard-ui/foundations";
import { HumanReviewSDK } from "../../../sdk";

type ConfirmRequest = Extract<HumanReview.Request, { variant: "confirm" }>;

// Approve / Reject → drives the approved | rejected port split.
export const ConfirmationCard = ({ request }: { request: ConfirmRequest }) => {
    
    const respond = (approved: boolean) =>
        HumanReviewSDK.actions.respond(request.id, { variant: "confirm", approved });

    return (
        <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => respond(false)} className="bg-red-500 hover:bg-red-600 text-sm font-medium text-white! px-2 py-1 rounded-xl">
                {request.rejectLabel}
            </Button>
            <Button variant="ghost" onClick={() => respond(true)} className="bg-emerald-500 hover:bg-emerald-600 text-sm font-medium text-white! px-2 py-1 rounded-xl">
                {request.approveLabel}
            </Button>
        </div>
    );
};
