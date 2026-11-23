#!/usr/bin/env node
import { spawn } from 'node:child_process';

console.log('\x1b[36m%s\x1b[0m', '⚡ Starting NetPulse ISP System (Backend API + Frontend)...');

const server = spawn('node', ['dist-server/server.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: '5000' },
});

const vite = spawn('npx', ['vite'], {
  stdio: 'inherit',
  env: { ...process.env },
});

function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', '🛑 Shutting down NetPulse services...');
  server.kill('SIGINT');
  vite.kill('SIGINT');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
