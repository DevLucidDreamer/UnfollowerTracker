/*
 * 맞팔 체커 북마클릿 (iOS Safari / Android Chrome / 데스크톱 공용)
 * instagram.com 페이지 안에서 실행되어, 로그인 세션으로 본인의
 * 팔로잉/팔로워를 수집하고 "맞팔 안 하는 계정"을 오버레이로 보여준다.
 *
 * 이 파일은 사람이 읽는 소스다. 실제 북마클릿은 build.js가 생성한다.
 */
(function () {
  "use strict";

  // ── 0. 중복 실행 방지 / 도메인 확인 ─────────────────────────────
  if (window.__matpalCheckerRunning) {
    alert("이미 실행 중입니다.");
    return;
  }
  if (!/(^|\.)instagram\.com$/.test(location.hostname)) {
    alert("instagram.com 에서 실행하세요. (로그인된 인스타 탭에서 북마크를 누르세요)");
    return;
  }
  window.__matpalCheckerRunning = true;

  var APP_ID = "936619743392459";
  var DELAY_MS = 800; // 페이지 간 대기(차단 회피)
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  // ── 1. 오버레이 UI ──────────────────────────────────────────────
  var host = document.createElement("div");
  host.id = "matpal-checker-overlay";
  var shadow = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
  document.documentElement.appendChild(host);

  shadow.innerHTML =
    '<style>' +
    ':host,*{box-sizing:border-box}' +
    '.wrap{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.55);' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
    'display:flex;align-items:flex-end;justify-content:center}' +
    '@media(min-width:600px){.wrap{align-items:center}}' +
    '.sheet{background:#fff;color:#111;width:100%;max-width:480px;max-height:90vh;' +
    'border-radius:16px 16px 0 0;display:flex;flex-direction:column;overflow:hidden}' +
    '@media(min-width:600px){.sheet{border-radius:16px}}' +
    '.head{padding:14px 16px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:8px}' +
    '.head h1{font-size:16px;margin:0;flex:1;font-weight:700}' +
    '.x{border:0;background:#f0f0f0;width:32px;height:32px;border-radius:16px;font-size:18px;cursor:pointer}' +
    '.status{padding:24px 16px;text-align:center;color:#555;font-size:14px}' +
    '.status.err{color:#c0212f}' +
    '.spin{display:inline-block;width:16px;height:16px;border:2px solid #ccc;border-top-color:#444;' +
    'border-radius:50%;animation:sp 1s linear infinite;vertical-align:-2px;margin-right:6px}' +
    '@keyframes sp{to{transform:rotate(360deg)}}' +
    '.tools{padding:10px 16px;display:flex;gap:8px;border-bottom:1px solid #eee}' +
    '.tools input{flex:1;padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px}' +
    '.btn{border:0;background:#0095f6;color:#fff;padding:9px 12px;border-radius:8px;font-size:13px;' +
    'font-weight:600;cursor:pointer;white-space:nowrap}' +
    '.summary{padding:8px 16px;font-size:12px;color:#666;background:#fafafa}' +
    'ul{list-style:none;margin:0;padding:0;overflow:auto;flex:1}' +
    'li{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid #f3f3f3}' +
    'li img{width:40px;height:40px;border-radius:20px;object-fit:cover;background:#eee;flex:none}' +
    '.meta{min-width:0;flex:1}' +
    '.uname a{color:#0a5bd3;text-decoration:none;font-weight:600;font-size:14px}' +
    '.fname{color:#777;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.badge{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:8px;background:#eee;' +
    'color:#555;font-size:10px;font-weight:600;vertical-align:1px}' +
    '.empty{color:#888;padding:24px 16px;text-align:center}' +
    '</style>' +
    '<div class="wrap">' +
    '  <div class="sheet">' +
    '    <div class="head"><h1>맞팔 체커</h1><button class="x" title="닫기">×</button></div>' +
    '    <div class="status"><span class="spin"></span>준비 중…</div>' +
    '    <div class="tools" hidden>' +
    '      <input type="search" placeholder="아이디·이름 검색" />' +
    '      <button class="btn copy">아이디 복사</button>' +
    '    </div>' +
    '    <div class="summary" hidden></div>' +
    '    <ul hidden></ul>' +
    '  </div>' +
    '</div>';

  var $ = function (sel) { return shadow.querySelector(sel); };
  var statusEl = $(".status");
  var toolsEl = $(".tools");
  var searchEl = $('input[type="search"]');
  var copyBtn = $(".copy");
  var summaryEl = $(".summary");
  var listEl = $("ul");

  function close() {
    window.__matpalCheckerRunning = false;
    host.remove();
  }
  $(".x").addEventListener("click", close);
  $(".wrap").addEventListener("click", function (e) { if (e.target === $(".wrap")) close(); });

  function setStatus(msg, isErr) {
    statusEl.hidden = false;
    statusEl.classList.toggle("err", !!isErr);
    statusEl.innerHTML = isErr ? "" : '<span class="spin"></span>';
    statusEl.appendChild(document.createTextNode(msg));
  }

  // ── 2. 데이터 수집 ──────────────────────────────────────────────
  var cookieMatch = document.cookie.match(/ds_user_id=(\d+)/);
  if (!cookieMatch) {
    setStatus("인스타그램에 로그인되어 있지 않습니다. 로그인 후 다시 시도하세요.", true);
    return;
  }
  var uid = cookieMatch[1];

  function fetchList(type) {
    var out = [];
    var maxId = "";
    var retries = 0;
    function step() {
      var url =
        "https://www.instagram.com/api/v1/friendships/" + uid + "/" + type + "/?count=50" +
        (maxId ? "&max_id=" + encodeURIComponent(maxId) : "");
      return fetch(url, { headers: { "x-ig-app-id": APP_ID }, credentials: "include" })
        .then(function (res) {
          if (res.status === 429) {
            if (retries++ >= 4) throw new Error("HTTP_429");
            return sleep(5000 * retries).then(step);
          }
          if (!res.ok) throw new Error("HTTP_" + res.status);
          retries = 0;
          return res.json().then(function (data) {
            (data.users || []).forEach(function (u) {
              out.push({
                pk: String(u.pk),
                username: u.username,
                full_name: u.full_name,
                profile_pic_url: u.profile_pic_url,
                is_private: !!u.is_private,
                is_verified: !!u.is_verified,
              });
            });
            var label = type === "following" ? "팔로잉" : "팔로워";
            setStatus(label + " 수집 중… " + out.length + "명");
            if (!data.next_max_id) return out;
            maxId = data.next_max_id;
            return sleep(DELAY_MS).then(step);
          });
        });
    }
    return step();
  }

  setStatus("팔로잉 수집 중…");
  fetchList("following")
    .then(function (following) {
      return sleep(DELAY_MS).then(function () {
        return fetchList("followers").then(function (followers) {
          return { following: following, followers: followers };
        });
      });
    })
    .then(function (r) {
      var followerIds = {};
      r.followers.forEach(function (u) { followerIds[u.pk] = true; });
      var notBack = r.following
        .filter(function (u) { return !followerIds[u.pk]; })
        .sort(function (a, b) { return a.username.localeCompare(b.username); });
      done(r, notBack);
    })
    .catch(function (e) {
      setStatus(errorMessage(e && e.message), true);
    });

  // ── 3. 결과 렌더링 ──────────────────────────────────────────────
  var notFollowingBack = [];

  function done(r, notBack) {
    notFollowingBack = notBack;
    statusEl.hidden = true;
    toolsEl.hidden = false;
    summaryEl.hidden = false;
    listEl.hidden = false;
    summaryEl.textContent =
      "팔로잉 " + r.following.length + " · 팔로워 " + r.followers.length +
      " · 맞팔 안 함 " + notBack.length;
    render("");
  }

  searchEl.addEventListener("input", function () {
    render(searchEl.value.trim().toLowerCase());
  });

  copyBtn.addEventListener("click", function () {
    var text = notFollowingBack.map(function (u) { return "@" + u.username; }).join("\n");
    var ta = document.createElement("textarea");
    ta.value = text;
    shadow.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    if (navigator.clipboard) { navigator.clipboard.writeText(text).catch(function () {}); }
    ta.remove();
    copyBtn.textContent = "복사됨!";
    setTimeout(function () { copyBtn.textContent = "아이디 복사"; }, 1500);
  });

  function render(query) {
    var rows = query
      ? notFollowingBack.filter(function (u) {
          return (
            u.username.toLowerCase().indexOf(query) >= 0 ||
            (u.full_name || "").toLowerCase().indexOf(query) >= 0
          );
        })
      : notFollowingBack;

    listEl.innerHTML = "";
    if (rows.length === 0) {
      var li0 = document.createElement("li");
      li0.className = "empty";
      li0.textContent = query ? "검색 결과 없음" : "맞팔 안 하는 계정이 없습니다 🎉";
      listEl.appendChild(li0);
      return;
    }

    var frag = document.createDocumentFragment();
    rows.forEach(function (u) {
      var li = document.createElement("li");

      var img = document.createElement("img");
      img.src = u.profile_pic_url || "";
      img.referrerPolicy = "no-referrer";
      img.alt = "";

      var meta = document.createElement("div");
      meta.className = "meta";

      var uname = document.createElement("div");
      uname.className = "uname";
      var a = document.createElement("a");
      a.href = "https://www.instagram.com/" + u.username;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "@" + u.username;
      uname.appendChild(a);
      if (u.is_private) uname.appendChild(badge("비공개"));
      if (u.is_verified) uname.appendChild(badge("인증"));

      meta.appendChild(uname);
      if (u.full_name) {
        var fname = document.createElement("div");
        fname.className = "fname";
        fname.textContent = u.full_name;
        meta.appendChild(fname);
      }

      li.appendChild(img);
      li.appendChild(meta);
      frag.appendChild(li);
    });
    listEl.appendChild(frag);
  }

  function badge(text) {
    var span = document.createElement("span");
    span.className = "badge";
    span.textContent = text;
    return span;
  }

  function errorMessage(code) {
    switch (code) {
      case "NOT_LOGGED_IN":
        return "인스타그램에 로그인되어 있지 않습니다.";
      case "HTTP_429":
        return "요청이 너무 많아 인스타그램이 일시 차단했습니다. 몇 분 후 다시 시도하세요.";
      case "HTTP_401":
      case "HTTP_403":
        return "권한 오류입니다. instagram.com 에서 다시 로그인 후 시도하세요.";
      default:
        return "데이터 수집 실패: " + (code || "알 수 없는 오류");
    }
  }
})();
