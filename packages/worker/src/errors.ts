export class AggexCompilerError extends Error {
    constructor(message: string) {
        super(message)

        Object.setPrototypeOf(this, AggexCompilerError.prototype);
        this.name = this.constructor.name;
    }
}

export class AggexExecutionError extends Error {
    constructor(message: string) {
        super(message)

        Object.setPrototypeOf(this, AggexExecutionError.prototype);
        this.name = this.constructor.name;
    }
}
    

export class SynthesizerError extends Error {
    constructor(message: string) {
        super(message)

        Object.setPrototypeOf(this, SynthesizerError.prototype);
        this.name = this.constructor.name;
    }
}

export class SynthesizerCoercionError extends Error {
    constructor(variant: string, value: any) {
        super(`Cannot coerce value of type "${typeof value}" into variant "${variant}"`)

        Object.setPrototypeOf(this, SynthesizerCoercionError.prototype);
        this.name = this.constructor.name;
    }
}