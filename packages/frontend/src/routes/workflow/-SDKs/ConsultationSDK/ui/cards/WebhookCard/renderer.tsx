import { Webhook } from "@pretzel-graph/shared/domain/Webhook";
import { ConsultationSDK } from "../../../sdk";
import { WebhookCard } from ".";

// The stack hands over the base Consultation.Request; the variant is what guarantees the
// extra webhook props are there, so the narrowing happens once, here.
const webhookCardRenderer: ConsultationSDK.Renderer = props => (
    <WebhookCard {...props} request={props.consultation as Webhook.Test.Consultation.Request} />
)

ConsultationSDK.register(Webhook.Test.Consultation.Variant, webhookCardRenderer)
