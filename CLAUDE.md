# 확률과 통계 HTML 슬라이드덱 — 작업 규칙

이 파일은 Claude가 매 세션 시작 시 읽는 협업 규칙입니다.

## 디자인 컨셉 2종 (한 덱에서 전환)

- **A · PPT 양식** (`data-concept="ppt"`): R02 코드코리아 PPT — 흰 배경 · 레드 `#E32A2C` · 좌상단 빨간 탭(소절 번호) · 우상단 섹션명 · 별 불릿 · 하단 빨간 라인. 캡처 `01_references/design/R02_screens/`
- **B · Discord** (`data-concept="discord"`): 루트 `DESIGN.md` — 인디고 캔버스 + 그라디언트 메시 · Blurple/그린/마젠타 · 굵은 디스플레이(ABC Ginto 대신 Hanken Grotesk). UI 작성 전 DESIGN.md 먼저 읽기.
- 두 컨셉은 `03_deck/assets/css/deck.css`의 CSS 변수로만 갈린다. 그래프 색도 `--viz-*` 변수 → JS가 읽음. 새 슬라이드는 공통 마크업만 쓰고 컨셉별 CSS로 꾸민다.
- 한글 Pretendard · 수식 KaTeX · 모션 anime.js 3.2.2 (cdnjs).

## 슬라이드 말투

- 코드코리아 강의자료 규칙(`kodekorea-lecture-slides` 스킬): 명사형 종결 · 청중 호칭 금지 · 한 장 7줄 이하 · 이모지 금지 · 미확정 정보는 "확정 후 기입".

## 03_deck 구조

- `sample.html` — 하이라이트 샘플 (슬라이드 = `<section class="slide">`, 노트 = `data-notes`)
- `assets/js/deck.js` — 엔진 (←→, #N, N 노트, T 컨셉 전환) · `assets/js/viz.js` — 모션 그래프 모듈 (`data-viz="이름"`)
- `tools/` — 에셋 생성 스크립트: `make_seaborn.py` (→ `assets/img/`), `manim_binom_to_normal.py` (→ `assets/video/`)
- 확인: Playwright + 설치된 Chrome으로 슬라이드별 스크린샷

## 폴더 역할

| 폴더 | 누가 넣나 | 용도 |
|---|---|---|
| `_inbox/` | 사용자 | 분류 안 된 자료를 일단 던져두는 곳. Claude가 읽고 `01_references/`로 옮기고 `REFERENCES.md`에 등록 |
| `00_brief/` | 함께 | 발표 목표·대상·분량·톤(`brief.md`), 전체 목차와 진행상태(`outline.md`) |
| `01_references/` | 사용자 → Claude 정리 | 원자료. 모든 파일은 `REFERENCES.md`에 ID(`R01`…)로 등록 |
| `02_content/` | Claude 초안 → 사용자 검토 | 섹션별 슬라이드 원고(Markdown). HTML 만들기 전 내용 확정용 |
| `03_deck/` | Claude | 실제 HTML 슬라이드덱 결과물 (`index.html` + `assets/`) |
| `04_feedback/` | 사용자 | 수정 요청(`feedback.md`), 확정된 결정(`decisions.md`) |
| `99_archive/` | Claude | 폐기·이전 버전 보관 (삭제 대신 이동) |

## ID 규칙 (소통의 핵심)

- **슬라이드 ID**: `S01`, `S02` … — `outline.md`에서 부여, 원고·HTML·피드백 모두 같은 ID 사용
- **레퍼런스 ID**: `R01`, `R02` … — `REFERENCES.md`에서 부여
- 원고/HTML에서 출처 표기: `[R03 p.45]`, `[R07 Fig.2]`
- 피드백 예: `S07: 정규분포 그래프 너무 작음, R03 p.112 그림처럼`

## 작업 흐름

1. `brief.md` 확정 → 2. `outline.md` 목차 확정 → 3. `02_content/` 원고 작성·검토 → 4. `03_deck/` HTML 제작 → 5. `feedback.md` 반영 반복

## Claude가 지킬 것

- 새 자료가 `_inbox/`에 있으면 먼저 정리·등록하고 보고한다.
- 수식은 KaTeX, 그래프는 인라인 SVG 또는 Chart.js 등 CDN 라이브러리 사용. 외부 파일 의존 최소화.
- 레퍼런스의 수치·정의·그림은 반드시 출처 ID를 단다. 레퍼런스에 없는 내용은 원고에 `[추가]`로 표시.
- 피드백 반영 후 `feedback.md` 해당 항목을 `[x]`로 체크하고 한 줄로 처리 내용을 적는다.
- 파일 삭제 대신 `99_archive/`로 이동.
