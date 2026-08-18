import { Global, Module } from "@nestjs/common";
import { MemberService } from './member.service';

@Global()
@Module({
    providers: [MemberService],
    exports: [MemberService],
})
export class MemberModule {}
