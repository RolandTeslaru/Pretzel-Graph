import { create } from "zustand";
import { BaseSDK } from "../Base";
import { immer } from "zustand/middleware/immer";
import { supabase } from "@/libs/supabase";
import { SDK } from "../SDKManager";
import { Auth } from "@pretzel-graph/shared/domain";
import { _createAuthActions_ } from "./actions";
import { SystemSDK } from "../SystemSDK";
import { router } from "@/main";

@SDK("Auth")
export class AuthSDKImpl extends BaseSDK<AuthSDK.State> {
  constructor() { super() }

  public readonly useStore: BaseSDK.Store<AuthSDK.State> = create(
    immer<AuthSDK.State>(() => ({
      isAuthenticated: false,
      user: null,
      isLoading: true,
    }))
  )

  /**
   * Initialize the Auth SDK.
   * Recover session and set up listeners.
   */
  public async init() {
    // Check active session
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error("Error fetching session", error)
    }

    if (session?.user) {
      await this.actions.syncUser(session.user.id as Auth.User.Id);
    } else {
      this.setState(s => { s.isLoading = false })
    }


      
    // Listen for changes
    supabase.auth.onAuthStateChange((event, session) => {                                                                                                                                                                         
      if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {                                                                                                                                                                                                    
              this.actions.syncUser(session.user.id as Auth.User.Id)                                                                                                                                                            
          }, 0)
      } else if (event === 'SIGNED_OUT') {
          this.setState(s => {
              s.user = null
              s.isAuthenticated = false
              s.isLoading = false
          })

          router.navigate({ to: '/auth' })
      }
  })
  }

  public readonly actions: AuthSDK.Actions = _createAuthActions_(this);
}

export namespace AuthSDK {
  export type State = {
    isAuthenticated: boolean;
    user: null | Auth.User;
    isLoading: boolean;
  }

  export type Actions = {
    login: (props: { email: string, password: string }) => Promise<boolean>
    logout: () => Promise<boolean>
    signup: (props: { email: string, password: string, username: string, displayName: string }) => Promise<boolean>
    syncUser: (userId: Auth.User.Id) => Promise<void>
  }
}

export const AuthSDK = SDK.get<AuthSDKImpl>("Auth")