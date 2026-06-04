import { UserManager, WebStorageStateStore } from "oidc-client-ts";

export const ownerUserManager = new UserManager({
  authority:
    (import.meta.env as Record<string, string>).VITE_AUTHENTIK_URL ??
    "http://test-authentik/application/o/owner-app/",
  client_id: "owner-app-public",
  redirect_uri: `${window.location.origin}/admin/callback`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  response_type: "code",
  // `groups` is required: the BFF owner-auth plugin authorises staff by the
  // `groups` claim, which Authentik only emits when the groups scope mapping
  // is requested (see infra/authentik/blueprints/owner-app.yaml).
  scope: "openid profile email groups",
  userStore: new WebStorageStateStore({ store: window.localStorage }),
});
