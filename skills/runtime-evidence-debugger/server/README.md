# Agent Debug Server

에이전트 범용 HTTP 로그 서버. Cursor, Claude Code, Codex CLI 등 모든 에이전트에서 공용 사용 가능.  
POST body JSON의 `logFile` 절대경로에 NDJSON 한 줄 append + CORS 지원.

## 빌드 (최초 1회)

```bash
docker build -t agent-debug-server ~/agent-tools/debug-server/
```

## 실행 (프로젝트 루트에서)

`$(pwd):$(pwd)` 마운트로 컨테이너가 호스트와 동일한 절대경로에 파일을 기록:

```bash
docker run -d \
  -p 7827:7827 \
  -v $(pwd):$(pwd) \
  --name agent-debug-server \
  agent-debug-server
```

### 포트 변경 시 (예: Cursor 7826과 분리)

```bash
docker run -d \
  -p 7828:7828 \
  -e PORT=7828 \
  -v $(pwd):$(pwd) \
  --name agent-debug-server \
  agent-debug-server
```

## 중지

```bash
docker stop agent-debug-server && docker rm agent-debug-server
```

## 헬스체크

이 서버 구현은 **유효한 JSON body**를 기대한다. 빈 POST는 400일 수 있으므로 아래처럼 확인한다.

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://127.0.0.1:7827 \
  -H 'Content-Type: application/json' \
  -d '{}' \
  --max-time 2
```

## 브라우저 CSP 우회

웹앱이 `connect-src` CSP 때문에 브라우저에서 `localhost`/`127.0.0.1`로 직접 `fetch`하지 못하면,
브라우저는 same-origin 앱 API를 호출하고 그 API가 이 서버로 프록시해야 한다.

- 브라우저: `POST /api/agentRuntimeDebug`
- 앱 API route: `POST http://127.0.0.1:7827`
- API route가 `logFile` 절대경로를 서버에서 주입

## 에이전트별 포트 권장

| 에이전트           | 권장 포트 | 비고                               |
| ------------------ | --------- | ---------------------------------- |
| Cursor Debug Mode  | 7826       | Cursor 자동 프로비저닝 (충돌 주의) |
| 이 서버 기본값     | 7827       | Cursor와 공존 가능                 |
| 기타 에이전트      | `PORT` env로 자유 설정 |                                    |
