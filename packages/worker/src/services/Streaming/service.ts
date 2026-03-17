import { container, singleton } from "tsyringe";

@singleton()
class StreamingServiceImpl {
    
}

export const StreamingService = container.resolve(StreamingServiceImpl);