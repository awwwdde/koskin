import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
const windows = process.platform === "win32";
const python = join(process.cwd(), ".venv", windows ? "Scripts/python.exe" : "bin/python");
if (!existsSync(python)) { console.error("Create .venv and install requirements.txt first. See README.md."); process.exit(1); }
const children = [];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) if (child.pid) {
    if (windows) spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
    else child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 500);
}
function run(cmd, args) {
  const child = spawn(cmd, args, { stdio: "inherit", windowsHide: true, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
  children.push(child);
  child.on("error", e => { console.error(e.message); stop(1); });
  child.on("exit", code => { if (!closing) stop(code || 0); });
}
run(python, ["-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8100", "--reload", "--reload-dir", "backend"]);
run(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3000"]);
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
