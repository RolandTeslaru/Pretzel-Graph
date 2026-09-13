import * as PublicationMod from "./publication";
import * as SignalMod from "./signal";
import * as ApiMod from "./api";

export namespace VersionControl {
    export import Publication = PublicationMod.Publication
    export import Signal      = SignalMod.Signal
    export import API         = ApiMod.API
}
