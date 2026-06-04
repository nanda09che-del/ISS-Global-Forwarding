# ISS Operations Portal

This version keeps the portal as a simple HTML app, but adds shared multi-user storage through a small local Node server.

## Run

```powershell
npm start
```

If `npm` or the system `node` command is blocked on this computer, use the bundled Node runtime:

```powershell
& "C:\Users\VICTUS\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.js
```

Open:

```text
http://localhost:3000
```

When opened through the server, the portal stores users, approvals, shipments, fleet, employees, settings, and notifications in:

```text
data/records.json
```

If you open `ISS Improved.html` directly from the file system, it still works in offline browser storage, but other users will not see the same data.

## Share With Others

Run the server on one computer and have other users open the host computer's network address, for example:

```text
http://YOUR-COMPUTER-IP:3000
```

Keep the server running while people use the portal.
