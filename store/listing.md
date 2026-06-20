# 크롬 웹스토어 등록 정보 (복붙용)

대시보드의 각 입력칸에 그대로 붙여넣을 수 있도록 정리했습니다.
영어 항목은 스토어가 영어 입력을 요구하거나 글로벌 노출을 원할 때 사용하세요.

---

## 항목 이름 (Name) — 최대 75자
```
맞팔 체커 - 언팔로워 찾기
```

## 요약 설명 (Summary) — 최대 132자
```
내가 팔로우하지만 나를 맞팔하지 않는 계정을 클릭 한 번으로 찾아줍니다. 본인 계정 데이터만, 기기 안에서만 분석하고 외부로 전송하지 않습니다.
```

## 카테고리
```
생산성 (Productivity)
```

## 언어
```
한국어 (필요 시 English 추가)
```

---

## 상세 설명 (Description)

```
맞팔 체커는 내가 팔로우하고 있지만 나를 다시 팔로우(맞팔)하지 않는 계정을 빠르게 찾아주는 도구입니다.

■ 사용법
1. 본인 계정으로 로그인된 instagram.com 탭을 엽니다.
2. 확장 아이콘을 클릭하고 "분석 시작"을 누릅니다.
3. 팔로잉·팔로워를 수집한 뒤 "맞팔 안 하는 계정" 목록을 보여줍니다.
   - 아이디를 누르면 프로필로 이동하고, 검색으로 거르거나 CSV로 내보낼 수 있습니다.

■ 개인정보 보호
- 아이디/비밀번호를 받지 않습니다. 이미 로그인된 본인 브라우저 세션을 사용합니다.
- 모든 처리는 사용자 브라우저 안에서만 일어나며, 어떤 데이터도 외부 서버로 전송하지 않습니다.
- 본인 계정의 본인 데이터(팔로잉/팔로워 목록)만 읽습니다.

■ 참고
- 짧은 시간에 너무 자주 실행하면 일시적으로 제한될 수 있으니 하루 몇 번 정도만 사용하세요.
- 본 확장은 Instagram / Meta 와 제휴·후원 관계가 없는 비공식 도구입니다.
```

### English (optional)
```
Unfollower Checker quickly finds accounts you follow that don't follow you back.

How it works
1. Open instagram.com in a tab where you're logged in to your own account.
2. Click the extension icon and press "Start".
3. It collects your following/followers and lists the accounts that don't follow you back. Click a username to open the profile, filter by search, or export as CSV.

Privacy
- It never asks for your username or password — it uses your already-logged-in browser session.
- All processing happens locally in your browser. No data is ever sent to any external server.
- It only reads your own account's data (your following/followers).

Note
- Avoid running it too frequently in a short time to prevent temporary rate limits.
- This is an unofficial tool and is not affiliated with or endorsed by Instagram / Meta.
```

---

## 단일 목적 설명 (Single purpose) — 개인정보 탭

```
이 확장의 단일 목적은, 사용자가 로그인한 본인 인스타그램 계정에서 "내가 팔로우하지만 나를 맞팔하지 않는 계정" 목록을 계산해 보여주는 것입니다.
```

### English
```
The single purpose of this extension is to compute and display the list of accounts that the user follows but that do not follow the user back, using the user's own logged-in Instagram session.
```

---

## 권한 사유 (Permission justifications) — 개인정보 탭

### `scripting`
```
사용자가 열어둔 instagram.com 탭에 데이터 수집 스크립트를 주입하여, 그 탭의 로그인 세션으로 본인의 팔로잉/팔로워 목록을 읽고 차집합을 계산하기 위해 필요합니다. 별도의 백그라운드 콘텐츠 스크립트를 상시 실행하지 않고, 사용자가 버튼을 눌렀을 때만 주입합니다.
```

### `host_permissions` (https://www.instagram.com/*)
```
본인 계정의 팔로잉/팔로워 데이터는 instagram.com 도메인에서만 조회할 수 있으므로, 해당 도메인 탭에 한해 스크립트를 주입하고 요청하기 위해 필요합니다. 다른 어떤 사이트에도 접근하지 않습니다.
```

### 원격 코드 사용 (Remote code) 
```
사용하지 않음 — 모든 코드는 확장 패키지에 포함되어 있으며 외부에서 코드를 내려받아 실행하지 않습니다.
```

---

## 데이터 사용 공개 (Data usage) — 체크 항목 안내

- 수집/사용하는 데이터: **개인 통신·금융 정보 없음.** 처리하는 것은 공개적으로 표시되는 팔로잉/팔로워 목록(아이디, 이름, 프로필 사진)뿐이며, 이는 **사용자 기기 내에서만** 사용됩니다.
- 다음 항목 모두 **체크(서약)** 해야 합니다:
  - ☑ 승인된 용도 외 제3자에게 데이터를 판매·이전하지 않습니다.
  - ☑ 신용도 산정·대출 등과 무관합니다.
  - ☑ 확장의 단일 목적과 무관한 용도로 데이터를 사용·이전하지 않습니다.
- **외부 전송 없음**: 이 확장은 어떤 데이터도 원격 서버로 전송하지 않습니다(코드 상 네트워크 전송 대상이 instagram.com 본인 세션 조회뿐).

---

## 개인정보 처리방침 URL
GitHub Pages 등으로 `store/privacy.html` 을 호스팅한 뒤 그 URL을 입력하세요.
예: `https://<your-id>.github.io/UnfollowerTracker/store/privacy.html`
