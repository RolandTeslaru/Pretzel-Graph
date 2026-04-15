import { create } from "zustand";
import { BaseSDK } from "../Base";
import { immer } from "zustand/middleware/immer";
import { supabase } from "@/libs/supabase";
import { SDK } from "../SDKManager";
import { Auth } from "@vx-agent-editor/shared/domain";
import type { PostgrestError, Session } from "@supabase/supabase-js"
import { _createAuthActions_ } from "./actions";

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

  public readonly db: AuthSDK.Db = {
    getUser: async (userId: Auth.User.Id) => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error)
        return { user: null, error }

      // console.log("Fetched User", data)

      const parsedUser = Auth.User.Schema.parse(data)

      return { user: parsedUser, error: null }
    },
    getSession: async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error("Error fetching session", error)
        return null
      }
      return session;
    }
  }

  /**
   * Initialize the Auth SDK.
   * Recover session and set up listeners.
   */
  public async init() {
    // Check active session
    const session = await this.db.getSession();
    if (session?.user) {
      await this.actions.syncUser(session.user.id as Auth.User.Id);
    } else {
      this.setState(s => { s.isLoading = false })
    }

    // Listen for changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await this.actions.syncUser(session.user.id as Auth.User.Id);
      }
      else if (event === 'SIGNED_OUT') {
        this.setState(s => {
          s.user = null;
          s.isAuthenticated = false;
          s.isLoading = false;
        })
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

  export type Db = {
    getUser: (userId: Auth.User.Id) => Promise<{ user: Auth.User | null, error: PostgrestError | null }>
    getSession: () => Promise<Session | null>
  }

  export type Actions = {
    login: (props: { email: string, password: string }) => Promise<boolean>
    logout: () => Promise<boolean>
    signup: (props: { email: string, password: string, username: string, displayName: string }) => Promise<boolean>
    syncUser: (userId: Auth.User.Id) => Promise<void>
  }
}

export const AuthSDK = SDK.get<AuthSDKImpl>("Auth")