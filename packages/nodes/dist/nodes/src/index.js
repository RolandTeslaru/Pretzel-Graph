"use strict";
// Node implementations are loaded dynamically by CatalogueService via blueprint ID convention.
// Blueprint ID "Core.Agent" resolves to src/Core/Agent/node.ts
// Blueprint ID "Integrations.OpenAI.Chat" resolves to src/Integrations/OpenAI/Chat/node.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAPIParsing = void 0;
var utils_1 = require("./utils");
Object.defineProperty(exports, "withAPIParsing", { enumerable: true, get: function () { return utils_1.withAPIParsing; } });
