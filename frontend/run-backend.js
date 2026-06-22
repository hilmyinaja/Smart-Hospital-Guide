/* global process */
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWin = os.platform() === 'win32';
// Gunakan path absolute agar kompatibel di shell apapun
const pythonExe = path.resolve(__dirname, isWin ? '../venv/Scripts/python.exe' : '../venv/bin/python');
const backendDir = path.resolve(__dirname, '../backend');

console.log('Menjalankan backend dengan Python:', pythonExe);

const child = spawn(pythonExe, ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--reload'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: false
});

child.on('error', (err) => {
  console.error('Gagal menjalankan backend:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
