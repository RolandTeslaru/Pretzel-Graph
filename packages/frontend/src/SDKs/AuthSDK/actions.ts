import axios from "axios";
import { toast } from "sonner";
import { Auth, Workspace } from "@pretzel-graph/shared/domain";
import { AuthSDK, AuthSDKImpl } from "./sdk";
import { api } from '@/SDKs/ApiInterceptorSDK';

export function _createAuthActions_(sdk: AuthSDKImpl): AuthSDK.Actions {
    return {
        login: async (props) => {
            const { data, error } = await sdk.client.signInWithPassword({
                email: props.email,
                password: props.password,
            })
            if (error || !data.user) {
                toast.error(`AuthSDK: Could not login: ${error?.message}`)
                return false;
            }

            let user: Auth.User
            let role: Workspace.Role
            try {
                ({ user, role } = await Auth.API.Me.get(api))
            } catch (error) {
                toast.error(`AuthSDK: Could not fetch user: ${error instanceof Error ? error.message : String(error)}`)
                return false
            }

            sdk.setState(s => {
                s.user = user;
                s.role = role;
                s.hasSession = true;
                s.access = 'granted';
            })
            toast.info("Logged In!")
            return true;
        },
        logout: async () => {
            const { error } = await sdk.client.signOut();

            if (error) {
                toast.error(`AuthSDK: Could not logout: ${error.message}`)
                return false;
            }

            sdk.setState(s => {
                s.user = null
                s.role = null
                s.hasSession = false
                s.access = 'denied'
            })
            return true
        },
        signup: async (props) => {
            const { email, password, username, displayName } = props
            const { data, error } = await sdk.client.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username,  // This goes into raw_user_meta_data
                        display_name: displayName,
                    }
                }
            });

            if (error || !data.user) {
                toast.error(`AuthSDK: Could not signup: ${error?.message}`)
                return false;
            }

            let user: Auth.User
            let role: Workspace.Role
            try {
                ({ user, role } = await Auth.API.Me.get(api))
            } catch (error) {
                toast.error(error instanceof Error ? error.message : String(error))
                return false
            }

            sdk.setState(s => {
                s.user = user;
                s.role = role;
                s.hasSession = true;
                s.access = 'granted';
            })
            toast.info("Logged In!")
            return true;
        },
        syncUser: async (_userId) => {
            try {
                const { user, role } = await Auth.API.Me.get(api)

                sdk.setState(s => {
                    s.user = user;
                    s.role = role;
                    s.access = 'granted';
                })
            } catch (error) {
                const status = axios.isAxiosError(error) ? error.response?.status : undefined

                // Refusing is an answer; anything else means the backend has
                // not answered yet, which is not the same as being signed out.
                const denied = status === 401 || status === 403

                if (!denied)
                    console.error("Could not reach the backend", error)

                sdk.setState(s => { s.access = denied ? 'denied' : 'unreachable' });
            }
        },
        updateMe: async (props) => {
            const { user } = await Auth.API.Me.update(api, props)

            sdk.setState(s => {
                s.user = user;
            })
            return user;
        }
    }
}
