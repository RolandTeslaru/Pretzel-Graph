import { create } from "zustand";
import { BaseSDK } from "../Base";
import type { SDKStore } from "../types";
import { immer } from "zustand/middleware/immer";
import { supabase } from "@/libs/supabase";
import { SDK } from "../SDKManager";
import { Auth } from "@vx-agent-editor/shared/types";

@SDK("Auth")
export class AuthSDKImpl extends BaseSDK<AuthSDK.State> {
  constructor() { super() }

  public readonly useStore: SDKStore<AuthSDK.State> = create(
    immer<AuthSDK.State>((set, get) => ({
      isAuthenticated: false,
      user: null,
    }))
  )

  public readonly actions = {
    login: async (props: {email: string, password: string}) => {
      debugger
      const { data, error } = await supabase.auth.signInWithPassword({
        email: props.email,
        password: props.password,
      })
      if (error || !data.user)
        alert(error?.message)

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user!.id)
        .single()

      if (userError) {
        alert(userError.message)
        return
      }

      const parsedUser = Auth.User.Schema.parse(userData);

      this.setState(s => {
        s.user = parsedUser;
        s.isAuthenticated = true;
      })
      alert("Logged In! Token is ready.")
    },
    logout: async () => {
      const { error } = await supabase.auth.signOut();

      if (error) {
        alert(error.message)
        return;
      }

      this.setState(s => {
        s.user = null,
          s.isAuthenticated = false
      })
    },
    signup: async (props: { email: string, password: string, username: string, displayName: string}) => {
      const { email, password, username, displayName } = props
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
        alert(error?.message ?? "Signup failed");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (userError) {
        alert(userError.message);
        return;
      }

      const parsedUser = Auth.User.Schema.parse(userData);

      this.setState(s => {
        s.user = parsedUser;
        s.isAuthenticated = true;
      })
      alert("Logged In! Token is ready.")
    }
  }
}

export namespace AuthSDK {
  export type State = {
    isAuthenticated: boolean;
    user: null | Auth.User;
  }
}

export const AuthSDK = SDK.get<AuthSDKImpl>("Auth")