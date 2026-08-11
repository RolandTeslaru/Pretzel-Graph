import { HumanReview } from "@pretzel-graph/shared/domain";
import { Button } from "@pretzel-graph/standard-ui/foundations";

type FormRequest = Extract<HumanReview.Request, { variant: typeof HumanReview.Variant.Form }>;

// Collect field values → Data port. TODO: drive fields through FieldRenderer.
export const FormCard = ({ request }: { request: FormRequest }) => (
    <div className="flex flex-col gap-2">
        <Button variant="ghost" className="bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20 text-sm font-medium text-white dark:text-black hover:text-white dark:hover:text-black px-2 py-1 rounded-xl">
            {request.sendLabel}
        </Button>
    </div>
);
