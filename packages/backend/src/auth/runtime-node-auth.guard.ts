import { CanActivate, ExecutionContext as NestExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Token } from '@/domain/Token';

export interface RuntimeNodeRequest extends Request {
    runtimeNode: { token: Token.RuntimeNode };
}

@Injectable()
export class RuntimeNodeAuthGuard implements CanActivate {
    canActivate(context: NestExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<RuntimeNodeRequest>();
        const raw = request.headers['runtime-node-token'];
        const value = typeof raw === 'string' ? raw : undefined;

        if (!value)
            throw new UnauthorizedException('Missing runtime node token');

        const configured = process.env.RUNTIME_NODE_INTERNAL_TOKEN;
        if (!configured)
            throw new UnauthorizedException('Runtime node auth not configured');

        if (value !== configured)
            throw new UnauthorizedException('Invalid runtime node token');

        const parsed = Token.RuntimeNode.safeParse(value);
        if (!parsed.success)
            throw new UnauthorizedException('Invalid runtime node token');

        request.runtimeNode = { token: parsed.data };
        return true;
    }
}
