/* ==========================================================================
   EYADA — TikTok publishing console (draft-upload flow)
   --------------------------------------------------------------------------
   Scopes exercised by this screen:
     user.info.basic / user.info.profile → the connected account is displayed
     user.info.stats                      → follower / like / video counts
     video.list                           → the creator's own recent videos
     video.upload                         → the approved video is delivered to
                                            the creator's TikTok DRAFTS
   EYADA never requests permission to publish public posts. The creator writes
   the caption, chooses privacy and interaction settings, and publishes inside
   the TikTok app.

   The client secret never touches the browser: every TikTok call is proxied by
   the EYADA backend, authenticated with a session token issued after the
   server-side code exchange.
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.EYADA_CONFIG || {};
  var API = window.EYADA_API_BASE;
  var TOKEN_KEY = "eyada_session";

  var $ = function (id) { return document.getElementById(id); };

  var views = {
    connect: $("state-connect"),
    post:    $("state-post"),
    status:  $("state-status")
  };

  function show(name) {
    Object.keys(views).forEach(function (k) {
      if (views[k]) views[k].hidden = (k !== name);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function token() {
    try { return window.localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  function api(path, options) {
    var opts = options || {};
    opts.headers = opts.headers || {};
    var t = token();
    if (t) opts.headers.Authorization = "Bearer " + t;
    return fetch(API + path, opts);
  }

  function nfmt(n) {
    if (n === null || n === undefined) return "—";
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }

  /* ---------------------------------------------------------------- OAuth */

  function randomState() {
    var bytes = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    return Array.prototype.map
      .call(bytes, function (b) { return ("0" + b.toString(16)).slice(-2); })
      .join("");
  }

  function connect() {
    if (!CFG.CLIENT_KEY) {
      alert("Set CLIENT_KEY in assets/config.js before connecting.");
      return;
    }
    var state = randomState();
    try { window.sessionStorage.setItem("eyada_oauth_state", state); } catch (e) {}

    window.location.href = CFG.AUTHORIZE_URL +
      "?client_key="   + encodeURIComponent(CFG.CLIENT_KEY) +
      "&scope="        + encodeURIComponent(CFG.SCOPES) +
      "&response_type=code" +
      "&redirect_uri=" + encodeURIComponent(CFG.REDIRECT_URI) +
      "&state="        + encodeURIComponent(state);
  }

  var btnConnect = $("btn-connect");
  if (btnConnect) btnConnect.addEventListener("click", connect);

  var btnDisconnect = $("btn-disconnect");
  if (btnDisconnect) {
    btnDisconnect.addEventListener("click", function () {
      if (!window.confirm("Disconnect TikTok? EYADA will delete the stored token and stop all API calls.")) return;
      api("/auth/tiktok/revoke", { method: "POST" })
        .catch(function () { /* the local session is cleared either way */ })
        .then(function () {
          try { window.localStorage.removeItem(TOKEN_KEY); } catch (e) {}
          show("connect");
        });
    });
  }

  /* ------------------------------------------------- connected account */

  function renderAccount(user) {
    var avatar = $("creator-avatar");
    if (user.avatar_url) {
      avatar.src = user.avatar_url;
      avatar.alt = "Profile picture of " + (user.display_name || "the connected account");
    } else {
      avatar.remove();
    }

    var name = user.display_name || "your account";
    $("creator-nickname").textContent = name;
    $("dest-account").textContent = name;
    $("creator-username").textContent = user.username ? "@" + user.username : "";

    $("stat-followers").textContent = nfmt(user.follower_count);
    $("stat-likes").textContent     = nfmt(user.likes_count);
    $("stat-videos").textContent    = nfmt(user.video_count);
  }

  function renderVideos(videos) {
    var grid  = $("video-grid");
    var empty = $("videos-empty");

    if (!videos || !videos.length) {
      if (empty) empty.textContent = "No videos on this account yet.";
      return;
    }
    if (empty) empty.remove();

    videos.slice(0, 6).forEach(function (v) {
      var card = document.createElement("article");
      card.className = "video-card";

      var cover = document.createElement("div");
      cover.className = "video-cover";
      if (v.cover_image_url) {
        var img = document.createElement("img");
        img.src = v.cover_image_url;
        img.alt = "";
        img.loading = "lazy";
        cover.appendChild(img);
      }
      card.appendChild(cover);

      var body = document.createElement("div");
      body.className = "video-body";

      var title = document.createElement("p");
      title.className = "video-title";
      title.textContent = v.title || v.video_description || "Untitled video";
      body.appendChild(title);

      var stats = document.createElement("p");
      stats.className = "video-stats";
      stats.textContent =
        nfmt(v.view_count) + " views · " +
        nfmt(v.like_count) + " likes · " +
        nfmt(v.comment_count) + " comments";
      body.appendChild(stats);

      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  function loadSession() {
    if (!API || !token()) { show("connect"); return; }

    api("/tiktok/me")
      .then(function (r) {
        if (r.status === 401 || r.status === 403) { show("connect"); return null; }
        if (!r.ok) throw new Error("me_failed");
        return r.json();
      })
      .then(function (data) {
        if (!data) return;
        renderAccount(data.user || data);
        show("post");
        return api("/tiktok/videos")
          .then(function (r) { return r.ok ? r.json() : { videos: [] }; })
          .then(function (d) { renderVideos(d.videos || []); });
      })
      .catch(function () { show("connect"); });
  }

  /* ------------------------------------------------------------ composer */

  var preview = $("preview-video");
  if (preview) {
    preview.addEventListener("loadedmetadata", function () {
      var s = Math.round(preview.duration || 0);
      if (s > 0) {
        $("meta-duration").textContent =
          Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
      }
    });
  }

  var btnCopy = $("btn-copy");
  if (btnCopy) {
    btnCopy.addEventListener("click", function () {
      var text = $("f-caption").value;
      var done = function () {
        btnCopy.textContent = "Caption copied";
        setTimeout(function () { btnCopy.textContent = "Copy caption"; }, 2200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        $("f-caption").select();
        try { document.execCommand("copy"); } catch (e) {}
        done();
      }
    });
  }

  /* ------------------------------------------------------------ uploading */

  function markStep(id, value, state) {
    var li = $("step-" + id);
    if (li) li.className = state || "is-done";
    var em = $("v-" + id);
    if (em) em.textContent = value;
  }

  function pollStatus(publishId) {
    var tries = 0;

    (function tick() {
      tries++;
      api("/tiktok/publish/" + encodeURIComponent(publishId))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var status = data.status || "PROCESSING_UPLOAD";
          $("v-status").textContent = status;

          if (status === "SEND_TO_USER_INBOX" || status === "PUBLISH_COMPLETE") {
            markStep("process", "complete");
            markStep("done", "ready");
            $("progress-bar").style.width = "100%";
            $("status-title").textContent = "The draft is waiting in your TikTok inbox";
            $("status-sub").textContent =
              "Open TikTok, tap the inbox notification, paste your caption, choose your settings, " +
              "and publish when you are ready.";
            $("done-actions").hidden = false;
            return;
          }

          if (status === "FAILED") {
            markStep("process", "failed", "is-failed");
            $("status-title").textContent = "TikTok could not process this video";
            $("status-sub").textContent =
              "Nothing was added to your account. Check the file meets TikTok's format " +
              "requirements and try again.";
            return;
          }

          $("progress-bar").style.width = Math.min(60 + tries * 3, 95) + "%";
          if (tries < 60) setTimeout(tick, 3000);
        })
        .catch(function () { if (tries < 60) setTimeout(tick, 4000); });
    })();
  }

  var form = $("post-form");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      show("status");
      markStep("init", "starting", "is-active");
      $("progress-bar").style.width = "12%";

      api("/tiktok/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: $("f-caption").value })
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
        .then(function (data) {
          $("v-publish-id").textContent = data.publish_id || "—";
          $("v-status").textContent = "PROCESSING_UPLOAD";
          markStep("init", "done");
          markStep("transfer", "done");
          markStep("process", "in progress", "is-active");
          $("progress-bar").style.width = "58%";
          pollStatus(data.publish_id);
        })
        .catch(function () {
          markStep("init", "failed", "is-failed");
          $("status-title").textContent = "The upload could not be started";
          $("status-sub").textContent =
            "Nothing was sent to TikTok. Check your connection and try again.";
        });
    });
  }

  /* ------------------------------------------------------------- start-up */
  loadSession();
})();
