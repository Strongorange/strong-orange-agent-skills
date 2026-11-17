# 점검 항목

각 항목: 찾는 법 → 방법(위에서부터 먼저 시도) → 함정. 괄호 안 숫자는 실제 사례에서 잰 값이라 대상 PC 에서 다시 잴 것.

## 1. 세션마다 뜨는 stdio MCP 서버 (가장 큼)

찾는 법: 세션 pid 를 부모로 둔 MCP 프로세스를 종류별로 셈. 세션 수 × 서버 수만큼 뜸(세션 5개에 약 7GB).

방법:
1. **필요 없는 서버는 기본 설정에서 뺌.** 가끔 쓰는 것은 별도 설정 파일에 두고 붙여 실행: `claude --mcp-config ~/.claude/mcp-optional.json` 을 alias 로. 이 alias 는 셸에서 실행할 때만 적용되고, 다른 앱이 띄우는 세션에는 안 붙음.
2. **원격 서버를 `mcp-remote` 로 감싸 쓰고 있으면 직접 연결.** Claude Code 는 `type: http` · `type: sse` 를 직접 붙음(세션당 약 100MB 절약). Codex 는 streamable HTTP 만 직접 붙고 SSE 는 못 붙어서 래퍼가 필요함.
3. **서버가 HTTP 실행을 지원하면 공용 서버 하나로.** 소스나 `--help` 에서 `--transport http` · `--port` 를 찾음. systemd user 서비스(macOS 는 launchd)로 상시 실행하고 `127.0.0.1` 에만 엶. 에이전트는 `type: http` 로 붙음(Python MCP 2개 × 세션 6개 1.5GB → 0.25GB).
4. **`npx` · `uv run` 래퍼로 띄우면 전역 설치 후 실행 파일 직접 실행.** 래퍼 프로세스가 서버마다 하나씩 더 붙음(약 120MB). 자동 업데이트가 없어지니 매일 도는 timer 로 `npm update -g <패키지>` 를 돌림.
5. **인증 헤더만 붙이는 로컬 중계(stdio → 원격 HTTP)는 `headersHelper` 로.** Claude Code 가 접속 때와 401 · 403 응답 때 헬퍼 명령을 다시 실행해 헤더를 새로 받음. 서명 만료가 짧아도 이어짐. 만료 시간보다 긴 간격으로 두 번 호출해 확인할 것.

함정:
- 공용 서버로 바꾸면 서버가 오래 살아서, 연결이 붙잡은 상태가 세션을 넘어 남음. 예: DB MCP 가 읽기 전용 모드에서 `autocommit` 을 끄면 REPEATABLE READ 스냅숏이 고정돼 새 행이 안 보임. 바꾸기 전에 연결 · 트랜잭션 처리를 읽을 것.
- 공용 서버가 죽으면 모든 세션이 같이 잃음. `Restart=always` 를 걸 것.
- stdio 만 지원하는 서버(대개 상태 없는 API 래퍼)도 stdio → HTTP 프록시로 공용화할 수 있지만, 가끔 쓰는 것이면 1번이 더 간단.
- 실행한 폴더에 묶인 서버(프로젝트의 dev 서버에 붙는 것)와 LSP 는 세션마다 뜨는 것이 맞는 구조.
- 팀 sync 스크립트가 등록을 관리하면 지워도 업데이트 때 다시 생김. 등록 여부를 무엇으로 판단하는지 읽을 것(예: `claude mcp get` 출력의 경로 문자열. 이 출력에는 `headersHelper` 가 안 나옴). 이 PC 에서만 끌 방법이 없으면 옵트인 옵션 · 끄기 파일(`~/.claude/.<이름>.optout`)을 팀 레포에 제안.
- Claude Code 는 `~/.claude/settings.json` 의 `mcpServers` 를 읽지 않음. 거기 적힌 서버는 원래 안 뜨므로 절감액에 넣지 말 것.

## 2. 에이전트의 LSP 플러그인

찾는 법: `tsserver.js` · `pyright-langserver` 등의 부모가 에이전트 세션인지. 옛 JS tsserver 는 큰 모노레포 worktree 하나에 1~2GB 까지 커짐.

방법:
- TypeScript: TS 7 네이티브 LSP(`tsc --lsp --stdio`)로 바꾼 로컬 플러그인을 만들고 공식 플러그인을 끔(같은 역할에 2.3GB → 0.3GB). 공식 플러그인의 정의는 마켓플레이스 업데이트 때 덮이므로 고치지 말 것. TS 7 은 전용 폴더(`npm install --prefix ~/.local/share/ts7-lsp typescript@7`)에 설치해 전역 `tsc` 를 건드리지 않음.
- 거의 안 쓰는 언어의 LSP(예: pyright, 세션당 150~180MB)는 끔. 끄면 에이전트가 그 언어에서 grep 과 파일 읽기로 찾음.

함정: 플러그인 · MCP 설정을 바꿔도 떠 있는 세션은 그대로. 오래된 세션이 옛 프로세스를 계속 붙잡고 있으니 재시작 대상 세션을 pid · 실행 시간으로 짚어 줄 것.

## 3. 에디터 (VS Code 계열)

- TypeScript 서버: TS 7 Native Preview 확장 + `typescript.experimental.useTsgo: true`(같은 파일 기준 1.17GB → 0.44GB). tsconfig 의 TypeScript 플러그인(Next 의 `next` 플러그인 등)은 동작 안 함.
- 안 쓰는 AI 채팅 확장 · 기능 끔(`chat.disableAIFeatures`). 서버가 띄우는 일부 프로세스는 끌 설정이 없음.
- `files.watcherExclude` 에 `dist` · `.next` 를 넣지 말 것. 패키지가 `dist` 의 타입을 쓰거나 라우트 타입이 `.next/types` 에 있으면 에디터 타입이 낡은 채로 남음.
- 사용자가 정해 둔 메모리 상한(`maxTsServerMemory` 등)은 묻기 전에 바꾸지 말 것.

## 4. WSL 메모리

- WSL 은 파일 캐시로 잡은 메모리를 Windows 에 잘 안 돌려줌(14GB 를 잡고 있던 사례). `autoMemoryReclaim=dropCache` 는 CPU 가 쉴 때만 돌아서 에이전트가 떠 있으면 거의 안 먹힘.
- 방법: 시스템 systemd timer 로 1시간마다 `sync; echo 1 > /proc/sys/vm/drop_caches`. 비운 메모리는 1~2분에 걸쳐 Windows 로 돌아옴(vmmemWSL 19.6GB → 12.4GB, 1회 관찰). sudo 가 필요하니 명령을 사용자에게 줄 것.
- `.wslconfig` 의 `memory=` 상한은 주 작업이 WSL 이면 낮추지 말 것. 낮추기 전에 사용자에게 물음.

## 5. 데스크톱 앱 · 시작 프로그램

- 시작 프로그램의 중복 등록 · 지운 앱의 남은 항목을 정리. 지우기 전에 목록을 백업 폴더에 내보냄.
- "필요할 때만 켜는" 앱은 자동 시작만 끔. 늘 쓰는 앱(메신저 · 회의 · 노트)은 크더라도 그대로.
- Windows 시작 메뉴의 Bing 웹 검색: `HKCU\Software\Microsoft\Windows\CurrentVersion\Search` 의 `BingSearchEnabled=0` + 정책 `HKCU\Software\Policies\Microsoft\Windows\Explorer` 의 `DisableSearchBoxSuggestions=1`. 정책 키는 관리자 권한이 필요해 명령을 사용자에게 줌. 파일 · 앱 검색(WSearch)은 그대로.
- GPU 드라이버 오버레이 · 주변기기 유틸리티의 상주 프로세스는 사용자가 꺼도 재부팅 뒤 다시 켜질 수 있음. 다음 점검 때 다시 확인.

## 6. 직접 만든 · 관리하는 앱

트레이 앱처럼 오래 켜 두는 앱이 "원래 이렇게 안 컸다"면 그 앱 자체를 봄. 사례(.NET 트레이 앱 1.6GB → 0.1GB):
- 큰 파일을 통째로 읽어 문자열로 만들지 말고 줄 단위로 읽고, 이미 읽은 위치부터 이어 읽음.
- 무거운 스캔은 같은 실행 파일을 다른 인자로 띄운 자식 프로세스에서 돌리고 결과만 받음. 끝나면 메모리가 통째로 돌아옴.
- GC 언어는 큰 작업 뒤 압축 GC 를 한 번 부르고, 런타임의 메모리 절약 옵션을 켬.
- 측정 → 설계 문서 → 단계별 구현 → 같은 측정으로 재확인. 할당량 예산 테스트를 남겨 회귀를 잡음.

## 7. 디스크 (메모리와 같이 정리할 때)

- Docker: build cache · 안 쓰는 이미지 · 볼륨 정리(볼륨은 사용자에게 남길 것을 물음). Windows 는 `docker_data.vhdx` 를 압축해야 공간이 돌아옴(Docker Desktop 을 완전히 꺼야 파일 잠금이 풀림).
- 지운 도구의 찌꺼기: 홈의 설정 폴더(`~/.<도구>`, `~/.<도구>-server`), AppData, 시작 메뉴, URL 스킴 레지스트리. API 키 파일은 지우기 전에 물음.
- 측정용으로 만든 파일 · 전역 설치 도구 · 빌드 산출물은 작업이 끝나면 지움. 산출물은 배포본이 남아 있는지 대조한 뒤.

## 공용 로컬 서버 보안 점검

공용 서버로 바꾸면 띄운 세션만 말을 걸던 stdio 와 달리 이 PC 의 다른 프로그램도 요청할 수 있음. 다음을 직접 요청해 확인:
- 외부 주소(LAN IP)로 접근 → 연결 안 돼야 함(`127.0.0.1` 바인딩)
- `Host: evil.example.com` → 거부(DNS rebinding)
- 외부 Origin 의 CORS preflight → 거부, `Content-Type: text/plain` 단순 요청 → 거부
- 세션 없이 도구 호출 → 거부
- Windows 쪽에서는 WSL 의 `127.0.0.1` 포트에 닿음(localhost 전달). 접속 정보가 이미 같은 사용자 권한 파일에 있었다면 노출 범위는 이전과 같음. 접속 정보는 600 권한 환경 파일로 옮김.
- 읽기 전용이어도 운영 DB 면 읽기만으로 개인정보가 나갈 수 있으니, 기준은 "누가 읽을 수 있나". 쿼리 로그에 파라미터가 남는지도 확인.
