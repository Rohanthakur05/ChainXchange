# ──────────────────────────────────────────────────────────────────
# ChainXchange — MongoDB Replica Set Setup (Run as Administrator!)
# ──────────────────────────────────────────────────────────────────
# This script:
#   1. Adds replication config to mongod.cfg
#   2. Restarts the MongoDB Windows service
#   3. Initializes the replica set (rs0)
# ──────────────────────────────────────────────────────────────────

$cfgPath = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.cfg"
$mongodExe = "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"

# ── Step 1: Add replication to mongod.cfg ─────────────────────────
$content = Get-Content $cfgPath -Raw
if ($content -match "replSetName") {
    Write-Host "✅ replSetName already configured in mongod.cfg" -ForegroundColor Green
} else {
    $content = $content -replace '#replication:', "replication:`n  replSetName: rs0"
    Set-Content -Path $cfgPath -Value $content -Force
    Write-Host "✅ Added replSetName: rs0 to mongod.cfg" -ForegroundColor Green
}

# ── Step 2: Restart MongoDB service ───────────────────────────────
Write-Host "⏳ Restarting MongoDB service..." -ForegroundColor Yellow
net stop MongoDB 2>$null
Start-Sleep -Seconds 3
net start MongoDB
Start-Sleep -Seconds 5
Write-Host "✅ MongoDB service restarted" -ForegroundColor Green

# ── Step 3: Initialize replica set ────────────────────────────────
Write-Host "⏳ Initializing replica set..." -ForegroundColor Yellow
& $mongodExe --version 2>$null
Start-Sleep -Seconds 2

# Use Node.js (already installed) to initialize the replica set
node -e "
const mongoose = require('$($PWD -replace '\\','/')/node_modules/mongoose');
async function run() {
    try {
        const c = await mongoose.createConnection('mongodb://127.0.0.1:27017/admin').asPromise();
        const db = c.db.admin();
        const result = await db.command({
            replSetInitiate: {
                _id: 'rs0',
                members: [{ _id: 0, host: '127.0.0.1:27017' }]
            }
        });
        console.log('✅ Replica set initialized:', result.ok === 1 ? 'SUCCESS' : result);
        await c.close();
    } catch (e) {
        if (e.message.includes('already initialized')) {
            console.log('✅ Replica set already initialized!');
        } else {
            console.error('❌ Error:', e.message);
        }
    }
    process.exit(0);
}
run();
"

Write-Host ""
Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " Setup complete! Run 'npm start' to launch." -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
