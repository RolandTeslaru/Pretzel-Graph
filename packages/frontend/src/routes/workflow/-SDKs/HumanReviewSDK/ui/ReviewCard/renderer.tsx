import type { HumanReview } from "@pretzel-graph/shared/domain";
import type { InteractionSDK } from "../../../InteractionSDK";
import { ReviewCard } from ".";

// Binds a request to the stack entry's renderer signature.
export const reviewCardRenderer = (request: HumanReview.Request): InteractionSDK.Interaction.Renderer =>
    props => <ReviewCard request={request} {...props} />
