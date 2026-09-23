// OpenCode 플러그인. 도구 입력을 Claude Code hook 형식으로 바꿔 ../hooks/*.py 에 넘김.
// install.py 가 ~/.config/opencode/plugins/tone-fix.js 로 링크해 둠.
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const HOOKS = path.join(path.dirname(fs.realpathSync(fileURLToPath(import.meta.url))), "..", "hooks")
const MARK = "[tone-fix]"

function lint(script, input) {
  const r = spawnSync("python3", [path.join(HOOKS, script)], { input: JSON.stringify(input), encoding: "utf8" })
  if (r.error) console.error(`tone-fix: python3 실행 실패(${r.error.message})`)
  return r
}

function toClaude(tool, args, directory) {
  const cwd = args.workdir ?? directory
  if (tool === "bash") return ["commit-pr-lint.py", { tool_name: "Bash", tool_input: { command: args.command }, cwd }]
  if (tool === "edit") return ["comment-lint.py", { tool_name: "Edit", tool_input: { file_path: args.filePath, new_string: args.newString } }]
  if (tool === "write") return ["comment-lint.py", { tool_name: "Write", tool_input: { file_path: args.filePath, content: args.content } }]
  if (tool === "apply_patch") return ["comment-lint.py", { tool_name: "apply_patch", tool_input: { command: args.patchText }, cwd }]
  return null
}

export const ToneFix = async ({ client, directory }) => {
  const handled = new Set()
  return {
    "tool.execute.before": async (input, output) => {
      const call = toClaude(input.tool, output.args ?? {}, directory)
      if (!call) return
      const r = lint(...call)
      if (r.status === 2) throw new Error(r.stderr.trim())
    },
    // 응답이 끝나면 검사하고, 걸리면 "다시 써라" 메시지를 보냄. opencode run 은 이 메시지를 처리하기 전에 끝남.
    event: async ({ event }) => {
      if (event.type !== "session.idle") return
      const id = event.properties.sessionID
      // 하위 에이전트 세션은 다시 써도 이미 결과를 받은 상위 세션에 전달되지 않음
      const session = await client.session.get({ path: { id } })
      if (session.data?.parentID) return
      const msgs = (await client.session.messages({ path: { id } })).data ?? []
      const userAt = msgs.findLastIndex((m) => m.info.role === "user")
      const lastUserText = (msgs[userAt]?.parts ?? []).find((p) => p.type === "text")?.text ?? ""
      if (lastUserText.startsWith(MARK)) return
      const replies = msgs.slice(userAt + 1).filter((m) => m.info.role === "assistant")
      const last = replies.at(-1)
      if (!last || handled.has(last.info.id)) return
      handled.add(last.info.id)
      const text = replies.flatMap((m) => m.parts.filter((p) => p.type === "text").map((p) => p.text)).join("\n")
      const r = lint("response-lint.py", { hook_event_name: "Stop", last_assistant_message: text })
      if (!r.stdout.trim()) return
      const { reason } = JSON.parse(r.stdout)
      await client.session.promptAsync({
        path: { id },
        body: { parts: [{ type: "text", text: `${MARK} ${reason}`, synthetic: true }] },
      })
    },
  }
}
