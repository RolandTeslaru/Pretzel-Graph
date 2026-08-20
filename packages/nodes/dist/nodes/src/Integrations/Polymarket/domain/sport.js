"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Team = exports.Sport = void 0;
const zod_1 = require("zod");
/** A league that has markets — "ncaab", "nfl". `seriesId` links to the Series that holds its events. */
var Sport;
(function (Sport) {
    Sport.Schema = zod_1.z.object({
        id: zod_1.z.string().nullable(),
        sport: zod_1.z.string(),
        /** The Series carrying this league's events, if it has one. */
        seriesId: zod_1.z.string().nullable(),
    });
    Sport.fromGamma = (sport) => ({
        id: sport.id === null || sport.id === undefined ? null : String(sport.id),
        sport: sport.sport,
        seriesId: sport.series ?? null,
    });
})(Sport || (exports.Sport = Sport = {}));
/** A team in a league. `record` is a win-loss string like "12-4", not a number. */
var Team;
(function (Team) {
    Team.Schema = zod_1.z.object({
        id: zod_1.z.string().nullable(),
        name: zod_1.z.string().nullable(),
        abbreviation: zod_1.z.string().nullable(),
        league: zod_1.z.string().nullable(),
        record: zod_1.z.string().nullable(),
    });
    Team.fromGamma = (team) => ({
        id: team.id === null || team.id === undefined ? null : String(team.id),
        name: team.name ?? null,
        abbreviation: team.abbreviation ?? null,
        league: team.league ?? null,
        record: team.record ?? null,
    });
})(Team || (exports.Team = Team = {}));
