import { chromium } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export function chromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  if (existsSync(chromium.executablePath())) return chromium.executablePath();
  if (process.platform === 'win32') {
    const chrome = path.join(
      process.env.PROGRAMFILES || 'C:/Program Files',
      'Google/Chrome/Application/chrome.exe',
    );
    if (existsSync(chrome)) return chrome;
    const cache = path.join(os.homedir(), 'AppData/Local/ms-playwright');
    if (existsSync(cache))
      for (const entry of readdirSync(cache).reverse())
        if (entry.startsWith('chromium-')) {
          const exe = path.join(cache, entry, 'chrome-win/chrome.exe');
          if (existsSync(exe)) return exe;
        }
  }
  throw new Error(
    'Install Chromium: npx playwright install chromium (or set PLAYWRIGHT_CHROMIUM_EXECUTABLE)',
  );
}
