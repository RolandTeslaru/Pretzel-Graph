import type { Realtime } from "@pretzel-graph/shared/domain";

// Applies events strictly in arrival order even when one has to wait on something async.
// The tail is the promise for the most recently added event; each new one chains off it.
export class AsyncEventQueueHandler<T extends Realtime.Event = Realtime.Event> {

    private tail       = Promise.resolve();
    private generation = 0;

    constructor(
        private readonly handler: (event: T) => void | Promise<void>,
    ) {}

    public add(event: T) {
        const generation = this.generation;

        this.tail = this.tail
            .then(() => {
                if (generation === this.generation)
                    return this.handler(event);
            })
            .catch(console.error);
    }

    /** Drops whatever is still pending; what is already running finishes. */
    public clear() {
        this.generation++;
    }
}
