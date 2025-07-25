import { existsSync, readFileSync, writeFileSync } from 'fs';
import { getPidFile, REFERENCE_COUNT_FILE } from '../constants';
import { readConfigFile } from '.';

export function incrementReferenceCount() {
    let count = 0;
    if (existsSync(REFERENCE_COUNT_FILE)) {
        count = parseInt(readFileSync(REFERENCE_COUNT_FILE, 'utf-8')) || 0;
    }
    count++;
    writeFileSync(REFERENCE_COUNT_FILE, count.toString());
}

export function decrementReferenceCount() {
    let count = 0;
    if (existsSync(REFERENCE_COUNT_FILE)) {
        count = parseInt(readFileSync(REFERENCE_COUNT_FILE, 'utf-8')) || 0;
    }
    count = Math.max(0, count - 1);
    writeFileSync(REFERENCE_COUNT_FILE, count.toString());
}

export function getReferenceCount(): number {
    if (!existsSync(REFERENCE_COUNT_FILE)) {
        return 0;
    }
    return parseInt(readFileSync(REFERENCE_COUNT_FILE, 'utf-8')) || 0;
}

export function isServiceRunning(isDev?: boolean): boolean {
    const pidFile = getPidFile(isDev);
    if (!existsSync(pidFile)) {
        return false;
    }

    try {
        const pid = parseInt(readFileSync(pidFile, 'utf-8'));
        process.kill(pid, 0);
        return true;
    } catch (e) {
        // Process not running, clean up pid file
        cleanupPidFile(isDev);
        return false;
    }
}

export function savePid(pid: number, isDev?: boolean) {
    const pidFile = getPidFile(isDev);
    writeFileSync(pidFile, pid.toString());
}

export function cleanupPidFile(isDev?: boolean) {
    const pidFile = getPidFile(isDev);
    if (existsSync(pidFile)) {
        try {
            const fs = require('fs');
            fs.unlinkSync(pidFile);
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

export function getServicePid(isDev?: boolean): number | null {
    const pidFile = getPidFile(isDev);
    if (!existsSync(pidFile)) {
        return null;
    }
    
    try {
        const pid = parseInt(readFileSync(pidFile, 'utf-8'));
        return isNaN(pid) ? null : pid;
    } catch (e) {
        return null;
    }
}

export async function getServiceInfo() {
    const isDev = process.env.NODE_ENV === 'development';
    const pid = getServicePid(isDev);
    const running = isServiceRunning(isDev);
    const config = await readConfigFile();
    
    return {
        running,
        pid,
        port: config.PORT,
        endpoint: `http://127.0.0.1:${config.PORT}`,
        pidFile: getPidFile(isDev),
        referenceCount: getReferenceCount()
    };
}
