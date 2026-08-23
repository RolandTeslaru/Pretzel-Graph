import { create } from "zustand";
import { BaseSDK } from "@pretzel-graph/standard-ui/SDKs/Base";
import { immer } from "zustand/middleware/immer";
import { GoTrueClient } from "@supabase/auth-js";
import { cookieStorage, PRETZEL_STORAGE_KEY } from "@pretzel-graph/standard-ui/utils/cookieStorage";
import { SDK } from "@pretzel-graph/standard-ui/SDKs/SDKManager";
import { Auth, Workspace } from "@pretzel-graph/shared/domain";
import { _createAuthActions_ } from "./actions";
import { SystemSDK } from "@pretzel-graph/standard-ui/SDKs/SystemSDK";
import { DialogSDK } from "@pretzel-graph/standard-ui/SDKs/DialogSDK";
import { AlertDialog } from "@pretzel-graph/standard-ui/foundations";
import { router } from "@/main";

const LOGOUT_DIALOG_ID = 'logout'

@SDK("Auth")
export class AuthSDKImpl extends BaseSDK<AuthSDK.State> {
  constructor() { super() }

  /** The auth server client. Everything that needs a token goes through here. */
  public readonly client = new GoTrueClient({
    url: import.meta.env.VITE_AUTH_URL || "http://localhost:9999",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Left unset the session stays on this host, as it always has.
    storageKey: PRETZEL_STORAGE_KEY,
    storage: cookieStorage({ domain: import.meta.env.VITE_SESSION_COOKIE_DOMAIN }),
  })

  /** The current access token, or null when signed out. */
  public async getToken(): Promise<string | null> {
    const { data } = await this.client.getSession()
    return data.session?.access_token ?? null
  }

  /** The signed-in user's id, or null when signed out. */
  public async getUserId(): Promise<Auth.User.Id | null> {
    const { data } = await this.client.getSession()
    return (data.session?.user.id as Auth.User.Id) ?? null
  }

  public readonly useStore: BaseSDK.Store<AuthSDK.State> = create(
    immer<AuthSDK.State>(() => ({
      isAuthenticated: false,
      user: null,
      role: null,
      isLoading: true,
    }))
  )

  /**
   * Initialize the Auth SDK.
   * Recover session and set up listeners.
   */
  public async init() {
    // Check active session
    const { data: { session }, error } = await this.client.getSession()
    if (error) {
      console.error("Error fetching session", error)
    }

    if (session?.user) {
      await this.actions.syncUser(session.user.id as Auth.User.Id);
    } else {
      this.setState(s => { s.isLoading = false })
    }


      
    // Listen for changes
    this.client.onAuthStateChange((event, session) => {                                                                                                                                                                         
      if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {                                                                                                                                                                                                    
              this.actions.syncUser(session.user.id as Auth.User.Id)                                                                                                                                                            
          }, 0)
      } else if (event === 'SIGNED_OUT') {
          this.setState(s => {
              s.user = null
              s.role = null
              s.isAuthenticated = false
              s.isLoading = false
          })

          router.navigate({ to: '/auth' })
      }
  })
  }

  /** Confirms first: signing out is one click from anywhere the menu opens. */
  public openLogOutDialog = () => {
    DialogSDK.actions.push(LOGOUT_DIALOG_ID, props => (
      <DialogSDK.AlertTemplate
        {...props}
        type='warning'
        approveLabel='Log out'
        onApprove={async () => {
          await this.actions.logout()
          DialogSDK.actions.pop(LOGOUT_DIALOG_ID)
        }}
        onCancel={() => DialogSDK.actions.pop(LOGOUT_DIALOG_ID)}
      >
        <AlertDialog.Title>Log out?</AlertDialog.Title>
        <AlertDialog.Description>
          You will need to sign in again to access your workflows.
        </AlertDialog.Description>
      </DialogSDK.AlertTemplate>
    ))
  }

  public readonly actions: AuthSDK.Actions = _createAuthActions_(this);
}

export namespace AuthSDK {
  export type State = {
    isAuthenticated: boolean;
    user: null | Auth.User;
    role: null | Workspace.Role;
    isLoading: boolean;
  }

  export type Actions = {
    login: (props: { email: string, password: string }) => Promise<boolean>
    logout: () => Promise<boolean>
    signup: (props: { email: string, password: string, username: string, displayName: string }) => Promise<boolean>
    syncUser: (userId: Auth.User.Id) => Promise<void>
    // Throws on failure so callers can map a 409 onto the offending form field.
    updateMe: (props: Auth.API.Me.Update.Request) => Promise<Auth.User>
  }
}

export const AuthSDK = SDK.get<AuthSDKImpl>("Auth")