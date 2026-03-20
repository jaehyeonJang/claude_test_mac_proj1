# tax_proj 구현 계획

## Architecture Decisions

| 결정 사항 | 선택 | 사유 |
|-----------|------|------|
| 클라이언트 상태 관리 | Zustand | 폼/보고서/채팅/히스토리/다크모드를 단일 스토어로 통합. 보일러플레이트 최소화 |
| 백엔드 AI 분석 | Next.js API Route (`app/api/analyze/route.ts`) | 스트리밍 응답 지원, law.go.kr CORS 우회, 서버 시크릿 격리 |
| 채팅 + 스트리밍 UI | @ai-elements (`conversation`, `message`, `prompt-input`) | Vercel 공식 AI UI 컴포넌트. 스트리밍 텍스트 렌더링 내장 |
| UI 스타일 프리셋 | shadcn `--preset b6F9NSGnr` | 전체 화면 스타일을 해당 프리셋으로 초기화 |
| AI 모델 | Gemini (Vercel AI SDK — `ai-sdk` skill) | `ai-sdk` skill 사용. API 키는 `.env.local`의 `GEMINI_API_KEY`에 저장 |

## Required Skills

| 스킬 | 용도 |
|------|------|
| `vercel-react-best-practices` | React/Next.js 성능 최적화 규칙 (리렌더 방지, localStorage 스키마, 하이드레이션 등) |
| `web-design-guidelines` | 접근성·UX 규칙 준수 확인 |

## UI Components

### 설치 필요

| 컴포넌트 | 설치 명령 |
|----------|-----------|
| `tabs` | `bunx --bun shadcn@latest add tabs` |
| `skeleton` | `bunx --bun shadcn@latest add skeleton` |
| `scroll-area` | `bunx --bun shadcn@latest add scroll-area` |
| `conversation`, `message`, `prompt-input` | `npx ai-elements add conversation message prompt-input` |

### 커스텀 컴포넌트

| 컴포넌트 | 역할 |
|----------|------|
| `HistorySidebar` | 히스토리 목록 표시, 항목 선택 시 폼+보고서 복원 |
| `InputForm` | 7개 필드 폼 + 자유 텍스트, 분석 요청 버튼 |
| `ReportView` | 보고서 조문/해석 탭 컨테이너 |

## 실행 프로토콜

- 각 task 시작 전, **참조 규칙**에 나열된 파일을 반드시 읽고 규칙을 준수하며 구현한다

## Tasks

### Task 1: 프로젝트 기반 설정

> **선행 배치 사유**: spec 테스트가 import할 page.tsx 스켈레톤과 store 인터페이스가 먼저 존재해야 컴파일 가능

- **시나리오**: 없음 (인프라 설정)
- **참조 규칙**:
  - `.claude/skills/vercel-react-best-practices/rules/client-localstorage-schema.md` — localStorage 스키마 버전 및 최소화
  - `.claude/rules/shadcn-guard.md` — components/ui 수정 금지
- **구현 대상**:
  - `lib/store/taxStore.ts` — Zustand 스토어 (form, report, chatHistory, history, darkMode 타입 정의)
  - `app/page.tsx` — 최소 스켈레톤 (HistorySidebar, InputForm, ReportView 플레이스홀더 import)
  - `.env.local.example` — `LAW_GO_KR_API_KEY`, `GEMINI_API_KEY` 키 템플릿
  - shadcn 프리셋 적용: `bunx --bun shadcn@latest init --preset b6F9NSGnr`
  - shadcn 컴포넌트 설치: `tabs`, `skeleton`, `scroll-area`
  - @ai-elements 설치: `conversation`, `message`, `prompt-input`
- **수용 기준**:
  - [ ] `bun run build` 오류 없음
  - [ ] `useTaxStore()`가 `form`, `report`, `chatHistory`, `history`, `darkMode` 필드를 반환
  - [ ] localStorage 스키마에 `version` 필드 포함
  - [ ] shadcn 프리셋 `b6F9NSGnr` 스타일이 적용됨 (테마 토큰 확인)
  - [ ] `.env.local`에 `GEMINI_API_KEY` 설정 시 AI 분석 정상 동작
- **커밋**: `chore: 프로젝트 기반 설정 (Zustand, env, shadcn 컴포넌트 설치)`

---

### Task 2: spec 테스트 생성 (Red)

- **시나리오**: TAX-001~011 전체
- **참조 규칙**:
  - `artifacts/spec.yaml` — 시나리오 examples의 input/expect 값 그대로 사용
  - `.claude/rules/shadcn-guard.md` — 컴포넌트 역할 기반 선택자 사용
- **구현 대상**:
  - `__tests__/tax_proj.spec.test.tsx` — TAX-001~011 수용 기준 테스트 (모두 실패 상태)
- **수용 기준**:
  - [ ] `bun run test` 실행 시 TAX-001~011 테스트가 존재하고 전부 실패(red)
  - [ ] `getByRole`, `getByLabelText` 등 구현에 의존하지 않는 선택자 사용
  - [ ] 각 테스트 이름에 시나리오 ID 명시 (예: `[TAX-001] 구조화된 폼으로 절세 분석 요청`)
- **커밋**: `test: TAX-001~011 spec 테스트 생성 (Red)`

---

### Task 3: 입력 폼 구현

- **시나리오**: TAX-001, TAX-002, TAX-007, TAX-008
- **참조 규칙**:
  - `.claude/skills/vercel-react-best-practices/rules/rerender-derived-state-no-effect.md` — 파생 상태를 effect 없이 렌더 중 계산
  - `.claude/skills/vercel-react-best-practices/rules/rerender-move-effect-to-event.md` — 폼 제출 로직을 이벤트 핸들러에
  - `.claude/rules/shadcn-guard.md`
  - `web-design-guidelines` — `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
- **구현 대상**:
  - `components/InputForm.tsx` — 7개 필드(소득유형 Select, 연간소득 Input, 부양가족 Input, 주택보유 Select, 금융소득 Select, 연금/퇴직소득 Select, 기납부세액 Input) + 자유 텍스트 Textarea
  - 분석 요청 버튼: 폼 또는 자유 텍스트 중 하나라도 입력 시 활성화
  - 로딩 중 버튼 비활성화 + Spinner 표시
- **수용 기준**:
  - [ ] 7개 필드 레이블이 `getByLabelText`로 접근 가능
  - [ ] 폼 미입력 + 자유 텍스트 미입력 시 '분석 요청' 버튼 비활성(`disabled`)
  - [ ] 자유 텍스트에 "프리랜서 소득으로 절세 방법 알려줘" 입력 시 버튼 활성화
  - [ ] 분석 요청 중 버튼이 비활성화되고 로딩 인디케이터가 표시됨
  - [ ] TAX-001, 002, 007, 008 spec 테스트 통과
- **커밋**: `feat: 입력 폼 컴포넌트 구현 (TAX-001, 002, 007, 008)`

---

### Task 4: API Route — 법DB + AI 분석

- **시나리오**: TAX-001, TAX-002, TAX-004, TAX-007, TAX-008, TAX-009
- **참조 규칙**:
  - `.claude/skills/vercel-react-best-practices/rules/async-parallel.md` — 법DB 검색과 LLM 호출 병렬화
  - `.claude/skills/vercel-react-best-practices/rules/async-api-routes.md` — Promise 조기 시작, 늦게 await
  - `.claude/skills/vercel-react-best-practices/rules/server-hoist-static-io.md` — 정적 설정 모듈 수준으로 끌어올리기
- **구현 대상**:
  - `app/api/analyze/route.ts` — POST 핸들러
    - law.go.kr OpenAPI 호출 (관련 법령 검색)
    - Claude API 스트리밍 호출 (조문 나열 + LLM 해석 생성)
    - ReadableStream으로 응답 반환
  - `lib/lawApi.ts` — law.go.kr API 클라이언트
  - `lib/claudeApi.ts` — Claude API 스트리밍 클라이언트
- **수용 기준**:
  - [ ] `POST /api/analyze` 에 폼 데이터 전송 시 스트리밍 응답 반환
  - [ ] 응답에 `statutes`(조문 목록)와 `interpretation`(LLM 해석) 구분
  - [ ] API 키 미설정 시 500 오류 반환 (env 누락 조기 감지)
- **커밋**: `feat: 법DB + Claude AI 분석 API Route 구현`

---

### Task 5: 보고서 컴포넌트

- **시나리오**: TAX-001, TAX-002, TAX-003
- **참조 규칙**:
  - `.claude/skills/vercel-react-best-practices/rules/rendering-usetransition-loading.md` — 탭 전환 로딩 상태에 useTransition 사용
  - `.claude/skills/vercel-react-best-practices/rules/bundle-dynamic-imports.md` — ReportView 동적 임포트 고려
  - `.claude/rules/shadcn-guard.md`
  - `web-design-guidelines`
- **구현 대상**:
  - `components/ReportView.tsx` — 보고서 영역
    - `Tabs` 컴포넌트: [해석 보기] (기본) / [조문 보기] 탭
    - 해석 탭: LLM 해석 텍스트 렌더링
    - 조문 탭: 법령명 + 조문 원문 목록
  - `Skeleton` 3개 카드로 로딩 플레이스홀더
- **수용 기준**:
  - [ ] 보고서 렌더링 후 `getByRole('tab', { name: '해석 보기' })` 기본 활성 확인
  - [ ] [조문 보기] 탭 클릭 시 조문 원문 표시, 해석 내용 숨김
  - [ ] [해석 보기] 탭 클릭 시 해석 내용 표시, 조문 원문 숨김
  - [ ] TAX-001, 002, 003 spec 테스트 통과
- **커밋**: `feat: 보고서 컴포넌트 구현 — 조문/해석 탭 (TAX-001, 002, 003)`

---

### Task 6: 채팅 컴포넌트

- **시나리오**: TAX-004, TAX-009
- **참조 규칙**:
  - `.claude/skills/vercel-react-best-practices/rules/rerender-memo.md` — 메시지 목록 메모이제이션
  - `.claude/skills/vercel-react-best-practices/rules/rerender-no-inline-components.md` — 메시지 버블을 인라인 컴포넌트로 정의 금지
  - `.claude/rules/shadcn-guard.md`
  - `web-design-guidelines`
- **구현 대상**:
  - `components/ChatSection.tsx` — 채팅 영역
    - `Conversation` (@ai-elements): 채팅 메시지 스크롤 컨테이너
    - `Message` (@ai-elements): 사용자/시스템 메시지 버블
    - `PromptInput` (@ai-elements): 입력 + 전송 버튼
  - 채팅 전송 → API 재호출 → 보고서 전체 재생성
  - 전송 중 로딩 인디케이터 표시
- **수용 기준**:
  - [ ] 채팅 입력 후 전송 시 사용자 메시지가 목록에 표시됨
  - [ ] 재생성 완료 후 시스템 메시지 "보고서가 업데이트되었습니다" 표시
  - [ ] 전송 중 PromptInput 비활성화 + 로딩 인디케이터 표시
  - [ ] TAX-004, 009 spec 테스트 통과
- **커밋**: `feat: 채팅 컴포넌트 구현 — 보고서 재생성 (TAX-004, 009)`

---

### Task 7: 히스토리 사이드바

- **시나리오**: TAX-005, TAX-010
- **참조 규칙**:
  - `.claude/skills/vercel-react-best-practices/rules/js-cache-storage.md` — localStorage 읽기 캐싱
  - `.claude/skills/vercel-react-best-practices/rules/client-localstorage-schema.md` — localStorage 스키마 버전 관리
  - `.claude/skills/vercel-react-best-practices/rules/rerender-lazy-state-init.md` — localStorage 초기값을 함수로 전달
  - `.claude/rules/shadcn-guard.md`
  - `web-design-guidelines`
- **구현 대상**:
  - `components/HistorySidebar.tsx`
    - 히스토리 목록 (요청 시각 + 소득 유형 표시)
    - 항목 클릭 시 폼 + 보고서 복원
  - Zustand store의 history 슬라이스 + localStorage 연동 (`persist` 미들웨어 또는 직접 구현)
  - 보고서 생성 완료 즉시 히스토리 자동 저장
- **수용 기준**:
  - [ ] 분석 완료 후 사이드바에 "근로소득 · 오늘 14:23" 형식 항목 즉시 추가
  - [ ] 히스토리 항목 클릭 시 폼 7개 필드가 해당 시점 값으로 복원됨
  - [ ] 새로고침 후에도 히스토리 목록 유지 (localStorage 확인)
  - [ ] TAX-005, 010 spec 테스트 통과
- **커밋**: `feat: 히스토리 사이드바 구현 (TAX-005, 010)`

---

### Task 8: 다크모드

- **시나리오**: TAX-006, TAX-011
- **참조 규칙**:
  - `.claude/skills/vercel-react-best-practices/rules/rendering-hydration-no-flicker.md` — 다크모드 초기값을 인라인 스크립트로 설정하여 FOUC 방지
  - `.claude/rules/shadcn-guard.md`
  - `web-design-guidelines`
- **구현 대상**:
  - 헤더 다크모드 Switch 토글 (shadcn `switch` 컴포넌트)
  - `app/layout.tsx`에 인라인 스크립트 삽입: localStorage 미설정 시 `prefers-color-scheme` 읽어 `<html>` 클래스 즉시 적용
  - Tailwind `dark:` 유틸리티로 전체 컴포넌트 다크 스타일 적용
- **수용 기준**:
  - [ ] 토글 클릭 시 `<html>` 요소에 `dark` 클래스 추가/제거 확인
  - [ ] localStorage `darkMode: true` 저장 후 새로고침 → 다크모드 유지 (FOUC 없음)
  - [ ] OS 다크모드 ON + localStorage 미설정 → 초기 로드 시 다크 테마 적용
  - [ ] TAX-006, 011 spec 테스트 통과
- **커밋**: `feat: 다크모드 구현 — OS 연동 + localStorage 유지 (TAX-006, 011)`

---

## 미결정 사항

- 히스토리 최대 저장 개수: 50개로 가정 (초과 시 오래된 항목 자동 삭제)
- 보고서 스트리밍 여부: 완료 후 일괄 표시로 시작, 추후 스트리밍으로 전환 가능하도록 API 설계
