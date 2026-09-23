# Runtime Debug Server Setup

이 skill의 기본 전제는 `POST http://127.0.0.1:7827`에 NDJSON append 서버가 떠 있다는 것이다.
로그 파일 경로 규칙은 `runtime-log-storage.md`를 따른다.

## 기본값: Node 직접 실행

이 서버는 [server/server.js](../server/server.js) 한 파일이며 Node 내장 모듈만 사용한다.
shared skill 관점에서는 Docker보다 이 경로를 기본값으로 둔다.

skill 루트에서 실행:

```bash
node server/server.js
```

다른 포트 사용:

```bash
PORT=7828 node server/server.js
```

백그라운드 실행 예시:

```bash
node server/server.js >/tmp/runtime-evidence-debugger.log 2>&1 &
```

## 헬스체크

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://127.0.0.1:7827 \
  -H 'Content-Type: application/json' \
  -d '{}' \
  --max-time 2
```

200이 아니면 서버가 안 떠 있거나 포트가 다르다.

## Docker 대안

Node 실행이 어렵거나 컨테이너 격리가 꼭 필요할 때만 사용한다.

skill 루트에서 이미지 빌드:

```bash
docker build -t runtime-evidence-debugger-server server
```

현재 프로젝트 절대경로에 로그를 쓰려면, 컨테이너도 같은 절대경로를 보게 마운트해야 한다.

```bash
docker run -d \
  -p 7827:7827 \
  -v "$(pwd):$(pwd)" \
  --name runtime-evidence-debugger-server \
  runtime-evidence-debugger-server
```

다른 포트 사용:

```bash
docker run -d \
  -p 7828:7828 \
  -e PORT=7828 \
  -v "$(pwd):$(pwd)" \
  --name runtime-evidence-debugger-server \
  runtime-evidence-debugger-server
```

중지:

```bash
docker stop runtime-evidence-debugger-server && docker rm runtime-evidence-debugger-server
```

## 브라우저 CSP 우회

웹앱이 `connect-src` CSP 때문에 브라우저에서 `localhost`/`127.0.0.1`로 직접 `fetch`하지 못하면,
브라우저는 same-origin 앱 API를 호출하고 그 API가 이 서버로 프록시해야 한다.

- 브라우저: `POST /api/agentRuntimeDebug`
- 앱 API route: `POST http://127.0.0.1:7827`
- API route가 `logFile` 절대경로를 서버에서 주입
