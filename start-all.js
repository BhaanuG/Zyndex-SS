import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env file loader
try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf-8');
        for (const line of envConfig.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                const [key, ...valueParts] = trimmed.split('=');
                const val = valueParts.join('=').trim().replace(/^['"]|['"]$/g, ''); // strip optional quotes
                process.env[key.trim()] = val;
            }
        }
    }
} catch (e) {
    console.warn('[SYSTEM] Failed to load .env file:', e.message);
}

// Fallback JAVA_HOME discovery for local user setup
if (!process.env.JAVA_HOME) {
    const fallbackJava = 'C:\\Users\\DELL\\.vscode\\extensions\\redhat.java-1.55.0-win32-x64\\jre\\21.0.11-win32-x86_64';
    if (fs.existsSync(fallbackJava)) {
        process.env.JAVA_HOME = fallbackJava;
    }
}

const isWindows = process.platform === 'win32';
const mvn = path.resolve(__dirname, isWindows ? 'mvnw.cmd' : 'mvnw');
const npm = isWindows ? 'npm.cmd' : 'npm';

const children = [];

function runProcess(name, command, args, cwd, delay = 0) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`[SYSTEM] Launching ${name}...`);
            const child = spawn(command, args, {
                cwd,
                env: {
                    ...process.env,
                    DB_PORT: process.env.DB_PORT || '3307',
                    DB_PASSWORD: process.env.DB_PASSWORD || ''
                },
                shell: true
            });

            child.stdout.on('data', (data) => {
                const lines = data.toString().split(/\r?\n/);
                for (const line of lines) {
                    if (line.trim()) {
                        console.log(`[${name}] ${line}`);
                    }
                }
            });

            child.stderr.on('data', (data) => {
                const lines = data.toString().split(/\r?\n/);
                for (const line of lines) {
                    if (line.trim()) {
                        console.error(`[${name}-ERR] ${line}`);
                    }
                }
            });

            child.on('error', (err) => {
                console.error(`[SYSTEM] Failed to start ${name}:`, err);
            });

            child.on('exit', (code) => {
                console.log(`[SYSTEM] ${name} process exited with code ${code}`);
            });

            children.push(child);
            resolve();
        }, delay);
    });
}

async function start() {
    // 1. Eureka Discovery Server (Port 8761)
    await runProcess('EUREKA-SERVER', mvn, ['spring-boot:run', '-pl', 'eureka-server'], __dirname);

    // Wait 12 seconds for Eureka to start
    console.log('[SYSTEM] Waiting 12 seconds for Eureka registry server to boot up...');
    
    // 2. Start downstream services
    await Promise.all([
        runProcess('AUTH-SERVICE', mvn, ['spring-boot:run', '-pl', 'auth-service'], __dirname, 12000),
        runProcess('CONTENT-SERVICE', mvn, ['spring-boot:run', '-pl', 'content-service'], __dirname, 12000),
        runProcess('ACCESS-SERVICE', mvn, ['spring-boot:run', '-pl', 'access-service'], __dirname, 12000),
        runProcess('USAGE-SERVICE', mvn, ['spring-boot:run', '-pl', 'usage-service'], __dirname, 12000),
        runProcess('SUBSCRIPTION-SERVICE', mvn, ['spring-boot:run', '-pl', 'subscription-service'], __dirname, 12000)
    ]);

    // Wait 10 seconds for services to register
    console.log('[SYSTEM] Waiting 10 seconds for service registrations to finalize...');

    // 3. Start Gateway & Frontend
    await Promise.all([
        runProcess('API-GATEWAY', mvn, ['spring-boot:run', '-pl', 'api-gateway'], __dirname, 10000),
        runProcess('FRONTEND', npm, ['run', 'dev'], __dirname, 10000)
    ]);
}

const cleanUp = () => {
    console.log('\n[SYSTEM] Shutting down application stack...');
    for (const child of children) {
        if (!child.killed) {
            if (isWindows) {
                spawn('taskkill', ['/pid', child.pid, '/f', '/t'], { shell: true });
            } else {
                child.kill('SIGINT');
            }
        }
    }
    process.exit(0);
};

process.on('SIGINT', cleanUp);
process.on('SIGTERM', cleanUp);

start().catch(err => {
    console.error('[SYSTEM] Initialization failed:', err);
    cleanUp();
});
