import { getURL } from "@/controllers/API/helpers/constants";
import { api } from "../ApiInterceptorSDK/sdk"
import { APIObjectType } from "@/types/api";

let cache: APIObjectType | null = null

export async function fetchShelfData() {
    const response = await api.get<APIObjectType>(
        `${getURL("ALL")}?force_refresh=true`,
    )

    return response.data
};