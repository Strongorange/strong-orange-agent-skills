# Runtime Evidence Log Storage

이 skill은 디버그 로그를 에이전트 전용 숨김 디렉터리가 아니라 프로젝트 내부의 중립 경로에 둔다.

## 경로 규칙

- **LOG_DIR**: `{projectRoot}/.runtime-evidence`
- **LOG_FILE**: `{LOG_DIR}/session-{SESSION_ID}.ndjson`

이 규칙을 쓰는 이유:

- 특정 에이전트 이름(`.cursor` 등)에 묶이지 않는다
- 세션별 파일이 분리되어 다른 재현과 섞이지 않는다
- `.ndjson` 확장자로 append-only 구조가 분명해진다

## 프록시/서버 주입 규칙

브라우저가 same-origin 프록시를 통해 로그를 보낼 때도 서버가 같은 경로 규칙으로 `logFile`을 주입한다.

예:

```ts
logFile: `${process.cwd()}/.runtime-evidence/session-${sessionId}.ndjson`
```

## 정리 규칙

- 현재 세션 파일만 지운다
- 다른 세션 파일은 건드리지 않는다
- 가능하면 전용 삭제 도구를 먼저 쓴다
- 전용 도구가 없으면 현재 환경의 가장 안전한 동등 수단을 쓴다
- 파일 내용을 비우는 truncate/touch보다 세션 파일 자체 삭제를 우선한다

## Git 관리

이 디렉터리는 임시 디버그 산출물이므로 커밋 대상이 아니다.
프로젝트에서 필요하면 로컬 ignore 규칙에 `.runtime-evidence/`를 추가한다.
