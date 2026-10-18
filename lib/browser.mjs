import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function browserPath() {
  if (process.env.CHROME_PATH) {
    if (!existsSync(process.env.CHROME_PATH)) throw new Error('CHROME_PATH does not point to a file.');
    return process.env.CHROME_PATH;
  }
  const paths = [chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
    join(process.env.PROGRAMFILES || '', 'Google/Chrome/Application/chrome.exe'),
    join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe')];
  const path = paths.find(p => existsSync(p));
  if (!path) throw new Error('No Chrome/Chromium found. Run npm run browser:install, or set CHROME_PATH.');
  return path;
}
export const launchBrowser = () => chromium.launch({ executablePath: browserPath(), headless: true });
