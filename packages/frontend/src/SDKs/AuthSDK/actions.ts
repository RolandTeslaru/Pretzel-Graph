import { supabase } from "@/libs/supabase";
import { toast } from "sonner";
import { Auth } from "@vx-agent-editor/shared/domain";
import { AuthSDK, AuthSDKImpl } from "./sdk";

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

            const userId = data.user!.id as Auth.User.Id

            const { user, error: userError } = await sdk.db.getUser(userId)

            if (userError) {
                toast.error(`AuthSDK: Could not fetch user: ${userError.message}`)
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

            const userId = data.user!.id as Auth.User.Id

            const { user, error: userError } = await sdk.db.getUser(userId)

            if (userError) {
                toast.error(userError.message)
                return false
            }

            sdk.setState(s => {
                s.user = user;
                s.isAuthenticated = true;
            })
            toast.info("Logged In!")
            return true;
        },
        syncUser: async (userId) => {
            const { user, error } = await sdk.db.getUser(userId)

            if (error) {
                console.error("Failed to fetch user profile", error);
                sdk.setState(s => { s.isLoading = false });
                return
            }

            if (!user) {
                console.error("User not found");
                sdk.setState(s => { s.isLoading = false })
                return;
            }

            sdk.setState(s => {
                s.user = user;
                s.isAuthenticated = true;
                s.isLoading = false;
            })
        }
    }
}
