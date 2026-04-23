import { supabase } from "@/libs/supabase";
import { toast } from "sonner";
import { Auth } from "@pretzel-graph/shared/domain";
import { AuthSDK, AuthSDKImpl } from "./sdk";
import { api } from '@/SDKs/ApiInterceptorSDK';

export function _createAuthActions_(sdk: AuthSDKImpl): AuthSDK.Actions {
    return {
        login: async (props) => {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: props.email,
                password: props.password,
            })
            if (error || !data.user) {
                toast.error(`AuthSDK: Could not login: ${error?.message}`)
                return false;
            }

            let user: Auth.User
            try {
                ({ user } = await Auth.API.Me.get(api))
            } catch (error) {
                toast.error(`AuthSDK: Could not fetch user: ${error instanceof Error ? error.message : String(error)}`)
                return false
            }

            sdk.setState(s => {
                s.user = user;
                s.isAuthenticated = true;
            })
            toast.info("Logged In!")
            return true;
        },
        logout: async () => {
            const { error } = await supabase.auth.signOut();

            if (error) {
                toast.error(`AuthSDK: Could not logout: ${error.message}`)
                return false;
            }

            sdk.setState(s => {
                s.user = null,
                    s.isAuthenticated = false
            })
            return true
        },
        signup: async (props) => {
            const { email, password, username } = props
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username,  // This goes into raw_user_meta_data
                    }
                }
            });

            if (error || !data.user) {
                toast.error(`AuthSDK: Could not signup: ${error?.message}`)
                return false;
            }

            let user: Auth.User
            try {
                ({ user } = await Auth.API.Me.get(api))
            } catch (error) {
                toast.error(error instanceof Error ? error.message : String(error))
                return false
            }

            sdk.setState(s => {
                s.user = user;
                s.isAuthenticated = true;
            })
            toast.info("Logged In!")
            return true;
        },
        syncUser: async (_userId) => {
            try {
                const { user } = await Auth.API.Me.get(api)

                sdk.setState(s => {
                    s.user = user;
                    s.isAuthenticated = true;
                    s.isLoading = false;
                })
            } catch (error) {
                console.error("Failed to fetch user profile", error)
                sdk.setState(s => { s.isLoading = false });
            }
        }
    }
}
