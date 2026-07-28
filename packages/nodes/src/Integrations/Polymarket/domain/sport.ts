import { z } from "zod"

import { Gamma } from "./Gamma"


/** A league that has markets — "ncaab", "nfl". `seriesId` links to the Series that holds its events. */
export namespace Sport {

    export const Schema = z.object({
        id:       z.string().nullable(),
        sport:    z.string(),
        /** The Series carrying this league's events, if it has one. */
        seriesId: z.string().nullable(),
    })

    export const fromGamma = (sport: Gamma.Sport): Sport => ({
        id:       sport.id === null || sport.id === undefined ? null : String(sport.id),
        sport:    sport.sport,
        seriesId: sport.series ?? null,
    })
}

export type Sport = z.infer<typeof Sport.Schema>


/** A team in a league. `record` is a win-loss string like "12-4", not a number. */
export namespace Team {

    export const Schema = z.object({
        id:           z.string().nullable(),
        name:         z.string().nullable(),
        abbreviation: z.string().nullable(),
        league:       z.string().nullable(),
        record:       z.string().nullable(),
    })

    export const fromGamma = (team: Gamma.Team): Team => ({
        id:           team.id === null || team.id === undefined ? null : String(team.id),
        name:         team.name         ?? null,
        abbreviation: team.abbreviation ?? null,
        league:       team.league       ?? null,
        record:       team.record       ?? null,
    })
}

export type Team = z.infer<typeof Team.Schema>
