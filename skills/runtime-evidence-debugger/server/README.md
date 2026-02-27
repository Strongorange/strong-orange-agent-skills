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

## 에이전트별 포트 권장

| 에이전트           | 권장 포트 | 비고                               |
| ------------------ | --------- | ---------------------------------- |
| Cursor Debug Mode  | 7826       | Cursor 자동 프로비저닝 (충돌 주의) |
| 이 서버 기본값     | 7827       | Cursor와 공존 가능                 |
| 기타 에이전트      | `PORT` env로 자유 설정 |                                    |
