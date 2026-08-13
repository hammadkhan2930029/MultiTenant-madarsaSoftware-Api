import { spawn } from 'node:child_process';

let child = null;
let stopping = false;
let restartAttempts = 0;

const startChild = () => {
  child = spawn(process.execPath, ['src/server.js'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  child.once('spawn', () => {
    console.log(`[supervisor] API started with PID ${child.pid}.`);
  });

  child.once('exit', (code, signal) => {
    child = null;
    if (stopping) return;

    restartAttempts += 1;
    const delay = Math.min(1000 * (2 ** Math.min(restartAttempts - 1, 4)), 15000);
    console.error(`[supervisor] API exited (${signal || code}); restarting in ${delay}ms.`);
    setTimeout(startChild, delay);
  });

  setTimeout(() => {
    if (child && child.exitCode === null) restartAttempts = 0;
  }, 30000).unref();
};

const stop = (signal) => {
  if (stopping) return;
  stopping = true;
  if (!child) process.exit(0);
  child.once('exit', () => process.exit(0));
  child.kill(signal);
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));

startChild();
