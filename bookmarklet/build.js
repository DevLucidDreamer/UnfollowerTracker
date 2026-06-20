/*
 * src.js -> 산출물 3종 생성
 *   - bookmarklet.txt        : javascript: 북마클릿 (폴백용)
 *   - shortcut-payload.js    : iOS 단축어 "웹페이지에서 JavaScript 실행"에 붙여넣는 코드
 *   - install.html           : 단축어 우선 + 북마클릿 폴백 설치 안내 페이지
 * 사용법:  node build.js
 */
const fs = require("fs");
const path = require("path");

const srcPath = path.join(__dirname, "src.js");
const src = fs.readFileSync(srcPath, "utf8");

// 아주 가벼운 정리: 블록주석 / 줄주석 제거 후 공백 축소.
// (문자열 안의 // 를 건드리지 않도록 보수적으로 처리)
function minify(code) {
  // 블록 주석 제거
  let out = code.replace(/\/\*[\s\S]*?\*\//g, "");
  // 줄 단위로 처리: 따옴표 밖의 // 줄주석만 제거
  out = out
    .split("\n")
    .map((line) => stripLineComment(line))
    .join("\n");
  // 줄 앞뒤 공백 제거 후, 빈 줄 버리고 개행을 공백으로
  out = out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length)
    .join(" ");
  // 연속 공백 축소
  out = out.replace(/\s{2,}/g, " ");
  return out;
}

// 따옴표/정규식 리터럴 바깥에 있는 // 부터 줄 끝까지 제거
function stripLineComment(line) {
  let inStr = null; // ' " `
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const prev = line[i - 1];
    if (inStr) {
      if (c === inStr && prev !== "\\") inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inStr = c;
      continue;
    }
    if (c === "/" && line[i + 1] === "/") {
      return line.slice(0, i);
    }
  }
  return line;
}

const minified = minify(src);

// ── 1. 북마클릿 (폴백) ─────────────────────────────────────────────
const bookmarklet = "javascript:" + encodeURIComponent(minified);
fs.writeFileSync(path.join(__dirname, "bookmarklet.txt"), bookmarklet, "utf8");

// ── 2. iOS 단축어 페이로드 ─────────────────────────────────────────
// "웹페이지에서 JavaScript 실행" 액션은 코드가 끝날 때 completion(...) 을
// 반드시 호출해야 한다. 오버레이는 비동기로 계속 살아 있어야 하므로,
// IIFE 를 주입한 직후 completion 을 즉시 호출(fire-and-forget)한다.
const shortcutJs =
  "// 맞팔 체커 — iOS 단축어용 (instagram.com 탭에서 실행)\n" +
  minified +
  "\ncompletion(true);\n";
fs.writeFileSync(path.join(__dirname, "shortcut-payload.js"), shortcutJs, "utf8");

// ── 3. 설치 안내 페이지 ────────────────────────────────────────────
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>맞팔 체커 설치 (iOS / 모바일)</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    max-width: 640px; margin: 0 auto; padding: 24px 18px 64px; line-height: 1.6; }
  h1 { font-size: 22px; }
  h2 { font-size: 18px; margin-top: 36px; display: flex; align-items: center; gap: 8px; }
  h3 { font-size: 15px; margin: 18px 0 4px; }
  ol { padding-left: 20px; }
  li { margin: 8px 0; }
  code { background: rgba(127,127,127,.18); padding: 1px 6px; border-radius: 5px; }
  .box { border: 1px solid rgba(127,127,127,.35); border-radius: 12px; padding: 14px; margin: 16px 0; }
  textarea { width: 100%; height: 90px; font-family: monospace; font-size: 12px;
    border: 1px solid rgba(127,127,127,.35); border-radius: 8px; padding: 10px; }
  button { background: #0095f6; color: #fff; border: 0; border-radius: 8px;
    padding: 12px 16px; font-size: 15px; font-weight: 600; cursor: pointer; width: 100%; margin-top: 10px; }
  .ok { color: #1a8917; font-weight: 600; }
  .note { font-size: 13px; color: #888; }
  .rec { display: inline-block; background: #1a8917; color: #fff; font-size: 11px;
    font-weight: 700; padding: 2px 8px; border-radius: 999px; vertical-align: 2px; }
  .alt { display: inline-block; background: rgba(127,127,127,.3); color: inherit; font-size: 11px;
    font-weight: 700; padding: 2px 8px; border-radius: 999px; vertical-align: 2px; }
  .card { border: 1px solid rgba(127,127,127,.3); border-radius: 14px; padding: 4px 18px 18px;
    margin: 18px 0; }
  .run { background: rgba(26,137,23,.1); border: 1px solid rgba(26,137,23,.35);
    border-radius: 10px; padding: 10px 14px; margin: 14px 0; font-size: 14px; }
  details { margin-top: 8px; }
  summary { cursor: pointer; font-weight: 600; }
  a.bm { display:inline-block; background:#0095f6; color:#fff; padding:10px 16px;
    border-radius:8px; text-decoration:none; font-weight:600; }
</style>
</head>
<body>
  <h1>맞팔 체커 — 모바일 설치</h1>
  <p>인스타그램에서 <b>내가 팔로우하지만 나를 맞팔 안 하는 계정</b>을 찾아줍니다.
     앱 설치 없이 동작하고, 모든 처리는 <b>내 휴대폰 안에서만</b> 일어납니다.</p>

  <!-- ───────────── 방법 1: iOS 단축어 (추천) ───────────── -->
  <h2>방법 1 · iOS 단축어 <span class="rec">추천 · 가장 쉬움</span></h2>
  <p>iPhone 기본 <b>단축어</b> 앱으로 한 번 만들어두면, 다음부터는
     인스타에서 <b>공유 버튼 → 탭 한 번</b>으로 실행됩니다.</p>

  <div class="card">
    <h3>1) 단축어 만들기 (최초 1회)</h3>
    <ol>
      <li><b>단축어</b> 앱 열기 → 우측 상단 <code>+</code> 로 새 단축어.</li>
      <li>검색창에 <code>JavaScript</code> 입력 → <b>웹페이지에서 JavaScript 실행</b> 액션 추가.</li>
      <li>아래 <b>코드 복사</b> 버튼을 누르고, 액션의 코드 영역에 <b>붙여넣기</b>.</li>
      <li>위쪽 단축어 이름을 <code>맞팔 체커</code> 로, <b>공유 시트에 표시</b>를 켜기.</li>
    </ol>

    <div class="box">
      <textarea id="shortcut" readonly>${esc(shortcutJs)}</textarea>
      <button id="copyShortcut">단축어 코드 복사</button>
      <p class="note" id="copiedShortcut"></p>
    </div>

    <h3>2) 실행하기 (매번)</h3>
    <div class="run">
      <b>instagram.com 에 로그인</b>한 Safari 탭에서 →
      하단 <b>공유 버튼</b> <span aria-hidden="true">⬆️</span> →
      목록에서 <b>맞팔 체커</b> 탭 → 분석 시작!
    </div>
    <p class="note">※ 첫 실행 때 “이 웹페이지에서 실행 허용” 같은 확인이 한 번 떠요. <b>허용</b>을 누르면 됩니다.
       단축어를 <b>홈 화면에 추가</b>해두면 더 빠르게 열 수 있어요.</p>

    <details>
      <summary>여러 사람에게 나눠주려면?</summary>
      <p class="note">단축어 앱에서 <b>맞팔 체커</b> → 공유 → <b>iCloud 링크 복사</b>.
         그 링크를 받은 사람은 링크를 누르고 <b>“단축어 추가”</b> 한 번이면 끝입니다(코드 붙여넣기 불필요).</p>
    </details>
  </div>

  <!-- ───────────── 방법 2: 북마클릿 (폴백) ───────────── -->
  <h2>방법 2 · 북마클릿 <span class="alt">폴백 · Android·데스크톱 공용</span></h2>
  <p>단축어를 쓰기 어렵거나 Android·PC라면 북마크 하나로도 동작합니다.</p>

  <div class="box">
    <textarea id="code" readonly>${esc(bookmarklet)}</textarea>
    <button id="copy">북마클릿 코드 복사</button>
    <p class="note" id="copied"></p>
  </div>

  <h3>iPhone / iPad (Safari)</h3>
  <ol>
    <li>위 <b>북마클릿 코드 복사</b> 버튼을 누른다.</li>
    <li>아무 페이지에서나 공유 버튼 → <b>북마크 추가</b>. 이름을 <code>맞팔 체커</code>로 저장.</li>
    <li>Safari 하단 책 모양(북마크) → <b>편집</b> → 방금 만든 <code>맞팔 체커</code> 선택.</li>
    <li>주소(URL)란을 전부 지우고 <b>복사한 코드를 붙여넣기</b> → 완료.</li>
    <li><b>instagram.com 에 로그인</b>한 상태에서 주소창에 <code>맞팔</code>을 입력 →
        북마크가 뜨면 누르기.</li>
  </ol>

  <h3>Android Chrome / 데스크톱</h3>
  <ol>
    <li>코드를 복사해 새 북마크의 URL로 저장하면 끝.</li>
    <li>데스크톱은 아래 링크를 북마크바로 <b>드래그</b>해도 됩니다:</li>
  </ol>
  <p><a class="bm" id="bmlink" href="#">맞팔 체커</a></p>

  <!-- ───────────── 주의 ───────────── -->
  <h2>주의</h2>
  <p class="note">인스타그램 내부 API를 사용합니다. 짧은 시간에 너무 자주 실행하면 일시 차단(429)될 수 있으니
     하루 몇 번 정도로만 사용하세요. 모든 처리는 사용자 기기 안에서만 일어나며,
     ID/PW를 받거나 데이터를 외부로 전송하지 않습니다.</p>

  <script>
    function wireCopy(textareaId, btnId, msgId, doneMsg) {
      var ta = document.getElementById(textareaId);
      var raw = ta.value;
      var btn = document.getElementById(btnId);
      var msg = document.getElementById(msgId);
      btn.addEventListener("click", function () {
        ta.select();
        ta.setSelectionRange(0, raw.length);
        try { document.execCommand("copy"); } catch (e) {}
        if (navigator.clipboard) navigator.clipboard.writeText(raw).catch(function () {});
        msg.innerHTML = '<span class="ok">' + doneMsg + '</span>';
      });
      return raw;
    }

    wireCopy("shortcut", "copyShortcut", "copiedShortcut",
      "복사됨! 단축어 액션에 붙여넣으세요.");
    var bmRaw = wireCopy("code", "copy", "copied",
      "복사됨! 북마크 URL에 붙여넣으세요.");
    document.getElementById("bmlink").setAttribute("href", bmRaw);
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, "install.html"), html, "utf8");

console.log("OK");
console.log("- bookmarklet.txt      (" + bookmarklet.length + " chars)");
console.log("- shortcut-payload.js  (" + shortcutJs.length + " chars)");
console.log("- install.html");
