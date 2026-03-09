# MongoDB Replica Set Setup — Local Development

ChainXchange uses **MongoDB multi-document transactions** for atomic trade execution.
MongoDB requires a replica set to support transactions — even for a single server node.

---

## Windows (PowerShell — Admin)

### Step 1 — Create the data directory (if not already done)
```powershell
New-Item -ItemType Directory -Force -Path "C:\data\db"
```

### Step 2 — Start mongod with replica set mode
```powershell
mongod --replSet rs0 --dbpath "C:\data\db" --port 27017 --bind_ip 127.0.0.1
```
> Leave this terminal open. mongod must stay running.

### Step 3 — Initialise the replica set (one-time only)
Open a **new** PowerShell terminal:
```powershell
mongosh --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] })"
```

### Step 4 — Verify
```powershell
mongosh --eval "rs.status().ok"
# Expected output: 1
```

---

## macOS / Linux (Terminal)

```bash
# Create data dir
mkdir -p ~/data/db

# Start mongod with replica set
mongod --replSet rs0 --dbpath ~/data/db --port 27017 --bind_ip 127.0.0.1 &

# Wait 2 seconds, then initiate
sleep 2
mongosh --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] })"

# Verify
mongosh --eval "rs.status().ok"
```

---

## Persistent Setup (Windows — run mongod as a service)

To avoid manually starting mongod every time, create a `mongod.cfg`:

```yaml
# C:\data\mongod.cfg
storage:
  dbPath: C:\data\db
net:
  bindIp: 127.0.0.1
  port: 27017
replication:
  replSetName: rs0
```

Then install as a Windows service:
```powershell
mongod --config "C:\data\mongod.cfg" --install
net start MongoDB
```

---

## .env Configuration

After completing the steps above, your `.env` should have:
```
MONGO_URI=mongodb://127.0.0.1:27017/crypto-trading?replicaSet=rs0
```
This is already set correctly if you pulled the latest code.

---

## Why is this required?

MongoDB enforces that **transactions can only run on replica set members**.
A standalone `mongod` (no `--replSet` flag) does not maintain an oplog, which is
the internal structure MongoDB uses to make transactions atomic and rollback-safe.

Even a single-node replica set (`rs0` with one member) satisfies this requirement
and is the standard setup for local development at crypto exchanges.
