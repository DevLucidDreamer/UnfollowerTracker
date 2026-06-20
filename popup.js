"use strict";

const runBtn = document.getElementById("runBtn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const listEl = document.getElementById("list");
const searchEl = document.getElementById("search");
const summaryText = document.getElementById("summaryText");
const csvBtn = document.getElementById("csvBtn");

let notFollowingBack = []; // 결과 캐시 (검색/CSV용)

function setStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.classList.toggle("error", !!isError);
}

// 주입된 수집기가 보내는 진행 상황 표시
chrome.runtime.onMessage.addListener((m) => {
  if (m && m.type === "progress") {
    const label = m.list === "following" ? "팔로잉" : "팔로워";
    setStatus(`${label} 수집 중… ${m.count}명`);
  }
});

runBtn.addEventListener("click", run);
searchEl.addEventListener("input", () => render(searchEl.value.trim().toLowerCase()));
csvBtn.addEventListener("click", exportCsv);

async function run() {
  runBtn.disabled = true;
  resultsEl.hidden = true;
  setStatus("인스타그램 탭을 찾는 중…");

  const tab = await findInstagramTab();
  if (!tab) {
    setStatus("먼저 instagram.com 에 로그인한 탭을 열어주세요.", true);
    runBtn.disabled = false;
    return;
  }

  setStatus("데이터 수집 준비 중…");
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectFollowData,
      args: [800], // 페이지 간 대기(ms). 차단 회피용.
      world: "ISOLATED",
    });

    if (!result || result.error) {
      setStatus(errorMessage(result && result.error), true);
      runBtn.disabled = false;
      return;
    }

    const followerIds = new Set(result.followers.map((u) => u.pk));
    notFollowingBack = result.following
      .filter((u) => !followerIds.has(u.pk))
      .sort((a, b) => a.username.localeCompare(b.username));

    summaryText.textContent =
      `팔로잉 ${result.following.length} · 팔로워 ${result.followers.length} · ` +
      `맞팔 안 함 ${notFollowingBack.length}`;
    setStatus("");
    resultsEl.hidden = false;
    searchEl.value = "";
    render("");
  } catch (e) {
    setStatus("오류: " + (e && e.message ? e.message : String(e)), true);
  } finally {
    runBtn.disabled = false;
  }
}

function render(query) {
  const rows = query
    ? notFollowingBack.filter(
        (u) =>
          u.username.toLowerCase().includes(query) ||
          (u.full_name || "").toLowerCase().includes(query)
      )
    : notFollowingBack;

  listEl.innerHTML = "";
  if (rows.length === 0) {
    const li = document.createElement("li");
    li.textContent = query ? "검색 결과 없음" : "맞팔 안 하는 계정이 없습니다 🎉";
    li.style.color = "#777";
    listEl.appendChild(li);
    return;
  }

  const frag = document.createDocumentFragment();
  for (const u of rows) {
    const li = document.createElement("li");

    const img = document.createElement("img");
    img.src = u.profile_pic_url || "";
    img.referrerPolicy = "no-referrer";
    img.alt = "";

    const meta = document.createElement("div");
    meta.className = "meta";

    const uname = document.createElement("div");
    uname.className = "uname";
    const a = document.createElement("a");
    a.href = "https://www.instagram.com/" + u.username;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "@" + u.username;
    uname.appendChild(a);
    if (u.is_private) uname.appendChild(badge("비공개"));
    if (u.is_verified) uname.appendChild(badge("인증"));

    const fname = document.createElement("div");
    fname.className = "fname";
    fname.textContent = u.full_name || "";

    meta.appendChild(uname);
    if (u.full_name) meta.appendChild(fname);

    li.appendChild(img);
    li.appendChild(meta);
    frag.appendChild(li);
  }
  listEl.appendChild(frag);
}

function badge(text) {
  const span = document.createElement("span");
  span.className = "badge";
  span.textContent = text;
  return span;
}

function exportCsv() {
  const header = "username,full_name,is_private,profile_url\n";
  const body = notFollowingBack
    .map((u) => {
      const name = '"' + (u.full_name || "").replace(/"/g, '""') + '"';
      return [u.username, name, u.is_private ? "1" : "0", "https://www.instagram.com/" + u.username].join(",");
    })
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "not-following-back.csv";
  a.click();
  URL.revokeObjectURL(url);
}

async function findInstagramTab() {
  const active = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active[0] && /^https:\/\/www\.instagram\.com\//.test(active[0].url || "")) {
    return active[0];
  }
  const all = await chrome.tabs.query({ url: "https://www.instagram.com/*" });
  return all[0] || null;
}

function errorMessage(code) {
  switch (code) {
    case "NOT_LOGGED_IN":
      return "인스타그램에 로그인되어 있지 않습니다. 로그인 후 다시 시도하세요.";
    case "HTTP_429":
      return "요청이 너무 많아 인스타그램이 일시 차단했습니다. 몇 분 후 다시 시도하세요.";
    case "HTTP_401":
    case "HTTP_403":
      return "권한 오류입니다. instagram.com 에서 다시 로그인 후 시도하세요.";
    default:
      return "데이터 수집 실패: " + (code || "알 수 없는 오류");
  }
}

/**
 * instagram.com 탭 컨텍스트에서 실행되는 수집기.
 * 외부 변수를 참조하지 않는 자기완결 함수여야 함(executeScript 주입).
 */
async function collectFollowData(delayMs) {
  const APP_ID = "936619743392459";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const m = document.cookie.match(/ds_user_id=(\d+)/);
  if (!m) return { error: "NOT_LOGGED_IN" };
  const uid = m[1];

  async function fetchList(type) {
    const out = [];
    let maxId = "";
    let retries = 0;
    while (true) {
      const url =
        `https://www.instagram.com/api/v1/friendships/${uid}/${type}/?count=50` +
        (maxId ? "&max_id=" + encodeURIComponent(maxId) : "");
      let res;
      try {
        res = await fetch(url, {
          headers: { "x-ig-app-id": APP_ID },
          credentials: "include",
        });
      } catch (e) {
        return { error: "NETWORK" };
      }

      if (res.status === 429) {
        if (retries++ >= 4) return { error: "HTTP_429" };
        await sleep(5000 * retries);
        continue;
      }
      if (!res.ok) return { error: "HTTP_" + res.status };
      retries = 0;

      let data;
      try {
        data = await res.json();
      } catch (e) {
        return { error: "PARSE" };
      }

      for (const u of data.users || []) {
        out.push({
          pk: String(u.pk),
          username: u.username,
          full_name: u.full_name,
          profile_pic_url: u.profile_pic_url,
          is_private: !!u.is_private,
          is_verified: !!u.is_verified,
        });
      }

      try {
        chrome.runtime.sendMessage({ type: "progress", list: type, count: out.length });
      } catch (e) {
        /* 팝업이 닫혔을 수 있음 - 무시 */
      }

      if (!data.next_max_id) break;
      maxId = data.next_max_id;
      await sleep(delayMs);
    }
    return { users: out };
  }

  const following = await fetchList("following");
  if (following.error) return following;
  await sleep(delayMs);
  const followers = await fetchList("followers");
  if (followers.error) return followers;

  return { following: following.users, followers: followers.users };
}
