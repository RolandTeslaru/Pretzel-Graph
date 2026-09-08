import { edgeReducers } from "./edge";
import { fieldReducers } from "./field";
import { inputReducers } from "./input";
import { layoutReducers } from "./layout";
import { nodeReducers } from "./node";
import { portReducers } from "./port";
import { workflowReducers } from "./workflow";
import { clipboardReducers } from "./clipboard";
import { selectionReducers } from "./selection";
import { dependencyReducers } from "./dependency";
import { cacheReducers } from "./cache";
import { blueprintReducers } from "./blueprint";
import { credentialReducers } from "./credential";

export const documentReducers = {
    blueprint               : blueprintReducers,
    cache                   : cacheReducers,
    field                   : fieldReducers,
    edge                    : edgeReducers,
    node                    : nodeReducers,
    credential              : credentialReducers,
    port                    : portReducers,
    input                   : inputReducers,
    workflow                : workflowReducers,
    layout                  : layoutReducers,
    clipboard               : clipboardReducers,
    selection               : selectionReducers,
    dependency              : dependencyReducers,
}
