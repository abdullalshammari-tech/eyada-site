/* ==========================================================================
   EYADA — runtime configuration
   --------------------------------------------------------------------------
   Fill these in before recording the demo video or going live.

   CLIENT_KEY    Your TikTok app's client key. In sandbox this is the SANDBOX
                 client key, which is different from the production one.
   REDIRECT_URI  Must match EXACTLY one of the redirect URIs registered on the
                 TikTok developer portal, including https and no query string.
   SCOPES        Must match exactly the scopes enabled for the app/sandbox.
   API_BASE      Base URL of the EYADA backend that holds the client secret and
                 performs the token exchange + Content Posting API calls.
                 Leave null only for a static preview of the page.
   ========================================================================== */

window.EYADA_CONFIG = {
  CLIENT_KEY:   "",                                   // e.g. "awxxxxxxxxxxxxxxxx"
  REDIRECT_URI: window.location.origin + window.location.pathname
                  .replace(/[^/]*$/, "") + "callback.html",
  SCOPES:       "user.info.basic,user.info.profile,user.info.stats,video.list,video.upload",
  AUTHORIZE_URL: "https://www.tiktok.com/v2/auth/authorize/"
};

/* Backend base URL. Set to null for a static preview; set to your API origin
   (https) when the real integration is running. */
window.EYADA_API_BASE = null;
