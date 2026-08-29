#!/usr/bin/env node
// Replaces pglite-server's own `--run '<command>'` flag. That flag works by
// calling child_process.spawn('npm', ...) without shell:true internally --
// on Windows, npm actually resolves to npm.cmd, so spawning it without a
// shell fails with ENOENT every time. Same story we already hit and fixed
// for npm's own script-shell (.npmrc) -- this is the same class of bug,
// just one level deeper, in a dependency we don't control.
//
// This script starts pglite-server itself, waits for it to accept
// connections, then runs `npm run db:migrate` with shell:true so it
// resolves correctly on every platform.
import { spawn } from 'node:child_process';
import net from 'node:net';

const PORT = 5432;
const HOST = '127.0.0.1';
const READY_TIMEOUT_MS = 20_000;

const pgliteArgs = process.argv.slice(2);
// A single command string (not a separate args array) with shell:true --
// passing both triggers Node's DEP0190 warning about unescaped args.
const server = spawn(['npx', 'pglite-server', ...pgliteArgs].join(' '), {
  stdio: 'inherit',
  shell: true,
});

server.on('exit', (code) => {
  // If pglite-server itself dies (e.g. port already in use), don't leave
  // this script -- and the migration that depends on it -- hanging.
  process.exitCode = code ?? 1;
});

function waitForPort(port, host, timeoutMs) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const tryConnect = () => {
      const socket = net.createConnection({ port, host });

      socket.once('connect', () => {
        socket.end();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for PGlite on ${host}:${port}`));
          return;
        }
        setTimeout(tryConnect, 200);
      });
    };

    tryConnect();
  });
}

async function main() {
  await waitForPort(PORT, HOST, READY_TIMEOUT_MS);

  await new Promise((resolve, reject) => {
    const migrate = spawn('npm run db:migrate', {
      stdio: 'inherit',
      shell: true,
    });

    migrate.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`db:migrate exited with code ${code}`));
      }
    });
  });
}

main().catch((error) => {
  console.error(error);
  server.kill();
  process.exitCode = 1;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.kill();
    process.exit(0);
  });
}
