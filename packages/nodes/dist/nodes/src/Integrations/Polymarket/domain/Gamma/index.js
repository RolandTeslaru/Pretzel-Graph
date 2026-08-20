"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gamma = void 0;
const GammaSchemaMod = __importStar(require("./schemas"));
const GammaAPIMod = __importStar(require("./api"));
var Gamma;
(function (Gamma) {
    Gamma.Common = GammaSchemaMod.Common;
    Gamma.Image = GammaSchemaMod.Image;
    Gamma.Tag = GammaSchemaMod.Tag;
    Gamma.TagRelationship = GammaSchemaMod.TagRelationship;
    Gamma.Category = GammaSchemaMod.Category;
    Gamma.FeeSchedule = GammaSchemaMod.FeeSchedule;
    Gamma.Market = GammaSchemaMod.Market;
    Gamma.Series = GammaSchemaMod.Series;
    Gamma.Event = GammaSchemaMod.Event;
    Gamma.Profile = GammaSchemaMod.Profile;
    Gamma.Reaction = GammaSchemaMod.Reaction;
    Gamma.Comment = GammaSchemaMod.Comment;
    Gamma.Team = GammaSchemaMod.Team;
    Gamma.Sport = GammaSchemaMod.Sport;
    Gamma.Search = GammaSchemaMod.Search;
    Gamma.API = GammaAPIMod.GammaAPI;
})(Gamma || (exports.Gamma = Gamma = {}));
