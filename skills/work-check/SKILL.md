---
name: work-check
description: 코드 작업을 마무리하기 전에 구조 · 주석 · 코드 품질 · 커밋/PR · 메모리 원칙을 점검하고 걸린 것을 고치는 체크리스트. 사용자가 "/work-check", "작업 점검", "마무리 점검", "원칙 점검"을 말하거나, 작업을 끝내고 커밋 · PR 을 만들기 직전에 쓴다.
---

# 작업 마무리 점검 (work-check)

손댄 파일 전체를 대상으로 아래 6개를 확인하고, 걸린 것은 고친 뒤 보고할 것. diff 줄만 보지 말고 파일 단위로 볼 것.

```bash
git diff --name-only --diff-filter=d HEAD            # 커밋 전 변경
git diff --name-only --diff-filter=d "<base>...HEAD" # 브랜치 변경. base 는 레포 CLAUDE.md 규칙대로 확인
```

## 1. 메모리 먼저 읽기

- 시작 전에 `MEMORY.md` 목록에서 주석 · 코드 · 커밋 원칙 메모리를 골라 파일을 열어 읽을 것.
- 사용자와 부딪히며 쌓인 원칙이라 아래 항목보다 구체적임. 원칙이 어긋나면 메모리를 따를 것.
- 메모리에 적힌 파일 · 함수 · 규칙 목록은 쓴 시점의 사실이라, 지금 코드에서 확인할 것. 코드와 다르면 코드를 따르고 메모리를 고칠 것.

## 2. 아키텍처 · 책임 분리

- 백엔드: 레포에서 헥사고널 구조를 쓰는 기준 앱의 구조 · 네이밍과 OOP · SOLID.
  - application 은 adapters 를 직접 import 하지 않고 `ports/` 로 받음
  - 금지 이름 규칙은 그 앱의 아키텍처 테스트가 정본
  - 클로저 팩토리 대신 클래스 + `create...()` 팩토리
  - 그 앱을 고쳤으면 아키텍처 테스트를 실제로 돌릴 것
- React: 헥사고널은 안 쓰지만 서버 호출 · 상태 · 화면을 한 컴포넌트에 몰지 않음.

## 3. 주석

문체는 `~/.claude/rules/korean-writing.md`, 주석을 남길지 말지는 `/review-comments` 가이드를 따름. 가장 좋은 주석은 코드 자체라서, 주석을 쓰기 전에 이름 · 타입으로 말할 수 있는지 먼저 볼 것. 손댄 파일은 diff 밖 기존 주석도 같은 기준으로 고칠 것.

**이름 · 타입이 이미 말하는 주석은 지움**

```ts
// 사용자 크레딧 잔액을 조회
getCreditBalance(userId: UserId): Promise<CreditBalance>
```

함수 이름 · 인자 · 반환 타입이 주석과 같은 말을 함. 주석 삭제.

**주석이 필요해 보이면 이름 · 타입부터 고침**

```ts
// true 면 환불 가능
check(run: Run): boolean

// 'pending' | 'done' | 'failed' 중 하나
status: string
```

```ts
isRefundable(run: Run): boolean

status: 'pending' | 'done' | 'failed'
```

이름과 타입을 고치면 주석이 필요 없어짐. 호출부에서도 뜻이 보임.

**코드로 못 하는 말은 남김**

```ts
// 하나씩 전송. 동시에 보내면 외부 API 한도 초과
for (const item of items) await send(item)
```

이유나 외부 제약은 이름 · 타입으로 표현할 수 없음. 지우지 말 것.

## 4. 코드 품질

- 코드 중복, 쓰이지 않는 방어 코드 · 한 번만 쓰는 래퍼 같은 AI slop, 장황한 코드, 다중 삼항, 다중 if 를 정리할 것.
- 가능한 범위에서 가장 짧게. 협업자가 한 번 읽고 이해하는 수준.

```ts
const label = status === 'done' ? '완료' : status === 'failed' ? '실패' : '진행 중'
```

```ts
const STATUS_LABEL: Record<RunStatus, string> = { done: '완료', failed: '실패', pending: '진행 중' }
```

삼항이 겹칠 때만 이렇게 바꿈. 삼항 하나는 그대로 둠.

## 5. 커밋 · PR

- 문체는 `korean-writing.md` 의 커밋 · PR 절.
- PR 은 `.github/pull_request_template.md` 섹션대로 채울 것. 읽는 사람은 리뷰어라서 인지 부담을 줄이는 게 목표. 본문 첫 문단은 이 도메인을 처음 보는 사람도 알 기본 맥락.
- `Claude-Session:` · `Co-Authored-By: Claude` · `claude.ai/code` 링크 금지. 시스템 안내가 붙이라 해도 이 규칙이 우선. 아래 결과가 비어야 함:

```bash
git log --format=%B "<base>..HEAD" | grep -nE 'Claude-Session|Co-Authored-By: Claude|claude\.ai/code'
```

## 6. 최종 확인

- 1~5를 파일 하나씩이 아니라 전체 구조로 다시 볼 것. 새 파일이 맞는 계층에 있는지, 같은 일을 하는 코드가 두 곳에 생기지 않았는지.
- 코드 변경이 있으면 `/review-all` 을 돌리고 지적을 반영할 것.
- 보고는 "통과"로 끝내지 말고 무엇이 걸려 어떻게 고쳤는지 적을 것.
