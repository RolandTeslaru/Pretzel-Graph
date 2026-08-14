import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ZodType } from 'zod';
import { Chat, Execution, SystemError, Workflow } from '@pretzel-graph/shared/domain';

/** Reads a resource id off the path. A malformed id is a not-found, like a missing row. */
const readParam = <T>(context: ExecutionContext, param: string, schema: ZodType<T>, notFound: string): T => {
    const request = context.switchToHttp().getRequest<Request>();

    const parsed = schema.safeParse(request.params[param]);

    if (!parsed.success)
        throw new SystemError(SystemError.Code.NOT_FOUND, notFound);

    return parsed.data;
};

export const WorkflowIdParam = createParamDecorator(
    (_: unknown, context: ExecutionContext) => readParam(context, 'workflowId', Workflow.Id, 'Workflow not found'),
);

export const ExecutionIdParam = createParamDecorator(
    (_: unknown, context: ExecutionContext) => readParam(context, 'executionId', Execution.Id, 'Execution not found'),
);

export const ChatIdParam = createParamDecorator(
    (_: unknown, context: ExecutionContext) => readParam(context, 'chatId', Chat.Id, 'Chat not found'),
);
