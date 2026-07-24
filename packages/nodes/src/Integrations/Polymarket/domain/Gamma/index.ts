import * as GammaSchemaMod from "./schemas"
import * as GammaAPIMod from "./api"

export namespace Gamma {
    export import Common          = GammaSchemaMod.Common
    export import Image           = GammaSchemaMod.Image
    export import Tag             = GammaSchemaMod.Tag
    export import TagRelationship = GammaSchemaMod.TagRelationship
    export import Category        = GammaSchemaMod.Category
    export import FeeSchedule     = GammaSchemaMod.FeeSchedule
    export import Market          = GammaSchemaMod.Market
    export import Series          = GammaSchemaMod.Series
    export import Event           = GammaSchemaMod.Event
    export import Profile         = GammaSchemaMod.Profile
    export import Reaction        = GammaSchemaMod.Reaction
    export import Comment         = GammaSchemaMod.Comment
    export import Team            = GammaSchemaMod.Team
    export import Sport           = GammaSchemaMod.Sport
    export import Search          = GammaSchemaMod.Search
    export import API             = GammaAPIMod.GammaAPI
}
