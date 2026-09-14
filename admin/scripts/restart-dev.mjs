import { execSync, spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 3001;

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const pids = new Set();
      for (const line of out.split('\n')) {
        if (!line.includes('LISTENING')) continue;
        const pid = line.trim().split(/\s+/).at(-1);
        if (pid && pid !== '0') pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
          console.log(`[admin] Stopped process ${pid} on port ${port}`);
        } catch {
          // already stopped
        }
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
    }
  } catch {
    // nothing listening
  }
}

killPort(PORT);
rmSync(join(process.cwd(), '.next'), { recursive: true, force: true });
console.log('[admin] Removed .next cache');
console.log(`[admin] Starting dev server on http://localhost:${PORT}`);

const child = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
