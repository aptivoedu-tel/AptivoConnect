# Aptivo development workspace

`final-main` runs the existing Aptivo website. `Connect` owns the Connect feature source, imported by the main site at `/connect`. Keep both folders together; the root npm workspace and lockfile link them without copying files.

```powershell
npm ci
npm run dev
```

Run those commands here. The main app uses `final-main/.env.local`; do not add another login or database for Connect. See [Connect/README.md](Connect/README.md) for the integration files and development checks. `npm run build` and `npm run start` also run the main app workspace.
