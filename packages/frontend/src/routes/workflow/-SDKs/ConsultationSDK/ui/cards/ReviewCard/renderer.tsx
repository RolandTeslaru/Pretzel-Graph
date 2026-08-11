import { HumanReview } from "@pretzel-graph/shared/domain";
import { ConsultationSDK } from "../../../sdk";
import { ReviewCard } from ".";

// The stack hands over the base Consultation.Request; the variant is what guarantees the
// extra HumanReview props are there, so the narrowing happens once, here.
const reviewCardRenderer: ConsultationSDK.Renderer = props => (
    <ReviewCard {...props} request={props.consultation as HumanReview.Request} />
)

ConsultationSDK.register(HumanReview.Variant.Confirm, reviewCardRenderer)
ConsultationSDK.register(HumanReview.Variant.Choice,  reviewCardRenderer)
ConsultationSDK.register(HumanReview.Variant.Form,    reviewCardRenderer)
