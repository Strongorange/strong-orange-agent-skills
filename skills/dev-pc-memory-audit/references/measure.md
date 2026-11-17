# 실측 명령

OS 마다 있는 것만 쓸 것. 숫자는 MB 로 맞춰 보고.

## Windows (PowerShell, WSL 에서는 `powershell.exe -NoProfile -Command '...'`)

```powershell
$os = Get-CimInstance Win32_OperatingSystem
"Total {0:N1}GB Used {1:N1}GB" -f ($os.TotalVisibleMemorySize/1MB), (($os.TotalVisibleMemorySize-$os.FreePhysicalMemory)/1MB)

# 앱별 합계. Private 이 실제로 차지하는 몫, WS 는 지금 RAM 에 올라온 몫
Get-Process | Group-Object Name | % { [pscustomobject]@{
  N=$_.Name; Priv=[int](($_.Group|Measure PrivateMemorySize64 -Sum).Sum/1MB)
  WS=[int](($_.Group|Measure WorkingSet64 -Sum).Sum/1MB); C=$_.Count } } |
  Sort Priv -Desc | Select -First 30 | Format-Table -AutoSize

# WebView2 는 부모를 따라가 주인 앱으로 묶음
$p = Get-CimInstance Win32_Process; $by=@{}; $p | % { $by[$_.ProcessId]=$_ }
$p | ? Name -eq msedgewebview2.exe | % { $x=$_; while($x -and $x.Name -eq 'msedgewebview2.exe'){ $x=$by[$x.ParentProcessId] }
  [pscustomobject]@{Owner=$x.Name; MB=[int]($_.PrivatePageCount/1MB)} } | Group Owner |
  % { "{0,-28} {1,5} MB" -f $_.Name, ($_.Group|Measure MB -Sum).Sum }
```

- 낯선 프로세스는 `ExecutablePath` 로 정체를 확인. 회사 보안 · 백신 에이전트면 보고에서 "그대로 둠"으로 표시.
- 시작 프로그램: `Get-CimInstance Win32_StartupCommand`, 레지스트리 `HKCU\...\Run` · `HKLM\...\Run`, 시작 폴더. 같은 앱이 두 곳에 등록된 중복을 찾음.
- PowerShell 출력이 깨지면(한국어 Windows) 비교용 텍스트만 영어로 쓰거나 `tr -d '\r'` 로 받음.

## WSL · Linux

```bash
free -m
# 프로세스 이름별 합계. node 계열은 이름이 MainThread 로 보이니 args 로 다시 봄
ps -eo rss,comm --sort=-rss | awk 'NR>1{s[$2]+=$1;c[$2]++} END{for(k in s) printf "%7d MB %3d %s\n", s[k]/1024, c[k], k}' | sort -rn | head -20
ps -eo rss,pid,ppid,etimes,args --sort=-rss | head -40 | cut -c1-200
```

- 에이전트 세션별 자식: `ps -eo pid,etimes,args | awk '$3=="claude"'` 로 세션 pid 를 찾고, `ps -eo rss,ppid,args` 에서 그 pid 를 부모로 둔 프로세스를 종류별(MCP 서버 이름 · `tsserver` · `pyright` 등)로 묶음.
- 새 세션에 자식이 안 뜨는지 볼 때: 세션을 백그라운드로 띄우고 1초 간격으로 `pgrep -P <pid>` 를 확인해 최대 개수를 적음.
- WSL 이 Windows 에 잡고 있는 양은 Windows 쪽 `vmmemWSL`(또는 `vmmem`). WSL 안의 `buff/cache` 가 크면 그만큼 Windows 로 안 돌아온 것.

## macOS

```bash
memory_pressure | tail -1
ps -eo rss,comm -m | head -30          # 메모리 순
footprint -p <pid> 2>/dev/null | tail -3   # 압축 메모리까지 포함한 실제 몫
```

- 활성 상태 보기의 "메모리" 열은 `footprint` 와 같은 기준. `ps` 의 RSS 는 압축 · 공유 페이지 때문에 다르게 나옴.
- 자동 시작: `launchctl list | grep -v com.apple`, 로그인 항목.

## 앱 하나를 깊게 볼 때

- .NET: `dotnet-counters`(GC 힙 · committed), `dotnet-gcdump`(무엇이 힙을 잡는지). 끝나면 전역 도구는 지움.
- Node: `--inspect` 힙 스냅숏, 또는 `process.memoryUsage()` 를 주기적으로 기록.
- 시간에 따라 흔들리면 2초 간격으로 파일에 바로 기록하는 스크립트를 쓰고, 끝날 때 한꺼번에 저장하는 방식은 쓰지 말 것(중간에 멈추면 결과가 사라짐).
