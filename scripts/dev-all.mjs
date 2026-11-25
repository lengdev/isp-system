#!/usr/bin/env node
import { spawn, execSync } from 'node:child_process';

console.log('\x1b[36m%s\x1b[0m', '⚡ Compiling NSMISP Server...');
try {
  execSync('npm run build:server', { stdio: 'inherit' });
} catch (e) {
  console.error('Server build failed, proceeding with existing bundle...', e.message);
}

console.log('\x1b[36m%s\x1b[0m', '⚡ Starting NSMISP ISP System (Backend API + Frontend)...');

// 1. Auto-recompile server/ files on change
const tscWatcher = spawn('npx', ['tsc', '-p', 'server/tsconfig.json', '-w', '--preserveWatchOutput'], {
  stdio: 'inherit',
  env: { ...process.env },
});

// 2. Auto-restart server when compiled bundle updates
const server = spawn('node', ['--watch-path=dist-server', 'dist-server/server.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: '5000' },
});

server.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error('\x1b[31m%s\x1b[0m', `⚠️ Backend server exited with code ${code}. Check if port 5000 is occupied.`);
  }
});

// 3. Vite frontend dev server
const vite = spawn('npx', ['vite'], {
  stdio: 'inherit',
  env: { ...process.env },
});

function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', '🛑 Shutting down NSMISP services...');
  try { tscWatcher.kill('SIGINT'); } catch {}
  try { server.kill('SIGINT'); } catch {}
  try { vite.kill('SIGINT'); } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
