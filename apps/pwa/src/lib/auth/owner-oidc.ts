import { UserManager, WebStorageStateStore } from "oidc-client-ts";

export const ownerUserManager = new UserManager({
  authority:
    (import.meta.env as Record<string, string>).VITE_AUTHENTIK_URL ??
    "http://test-authentik/application/o/owner-app/",
  client_id: "owner-app-public",
  redirect_uri: `${window.location.origin}/admin/callback`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  response_type: "code",
  scope: "openid profile email",
  userStore: new WebStorageStateStore({ store: window.localStorage }),
});
