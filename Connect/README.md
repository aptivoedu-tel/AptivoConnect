# Aptivo Connect

Connect is a feature of the main Aptivo website, served at `/connect` by `../final-main`. This folder owns Connect feature code and planning documents. It is a private npm workspace package, not a separate website or identity system.

## Folder connection

- `src/ConnectPage.tsx`: student-facing Connect content; edit it here.
- `package.json`: exports that live source as `@aptivo/connect`.
- `../final-main/app/connect/page.tsx`: the main site's route; checks the existing session and current account, then renders this package.
- `../final-main/components/connect/ConnectShell.tsx`: reuses Aptivo's sidebar, header, footer, and UI context.
- `../final-main/components/layout/Sidebar.tsx`: student navigation links to `/connect`, including the mobile sidebar.
- `../final-main/app/globals.css`: scans `Connect/src` for Tailwind classes.

New Connect UI and feature logic belongs here. Main-site routing, existing auth/database services, API integration, and shared navigation stay in `final-main`. Use those host services rather than creating another account, database, or copy of a shared component.

## Run from the shared parent folder

```powershell
cd C:\Users\aliab\OneDrive\Desktop\AC
npm ci
npm run dev
```

Open `/connect` on the same origin as Aptivo and sign in with an existing active, verified student account. `final-main/.env.local` remains the main app's configuration; Connect needs no separate credentials. The root `package-lock.json` owns dependency resolution. Both folders must be included in the checkout/build context, and deployment installation must run from this parent folder before building the `aptivo-portal` workspace.

The parent `.npmrc` preserves the app's existing React/Recharts and MongoDB/adapter peer mismatches. Those dependencies still need compatibility review; this integration does not upgrade them. Connect uses the main app's React version.

## Current scope and checks

See [current implementation status](docs/implementation-status.md) for the DNS remediation, security changes, seven inactive marketplace models, validation and remaining launch gate. This is the latest status; the original audit documents preserve the starting findings.

The student page introduces Connect and shows the catalog's coming-soon state. It creates no products, purchases, creator privileges, or financial records. Security remediation remains required before marketplace operations are enabled; see `aptivo-connect-workspace/05_SECURITY_AUDIT_AND_GATE.md` and `../final-main/docs/connect-repository-plan.md`.

From `final-main`, run `node scripts/connect-regression.cjs` for the folder-link and server-access checks, plus `node scripts/registration-regression.cjs` and `node scripts/mobile-regression.cjs` for existing authentication regressions. The route rejects inactive/unverified accounts using the current database record rather than relying on a cached JWT role.

Verified locally: a clean parent `npm ci` succeeds; both packages resolve the same React instance; all three regression scripts and full TypeScript checking pass; new page/config files pass targeted ESLint (the existing Next lint configuration warns that it cannot find a root `pages` directory). Next/Turbopack compiles `/connect` using the sibling source. An anonymous request contains Next's login redirect and no student-page content. Signed-in rendering is covered by mocked current-user records; a live database login and a production build/deployment have not been checked.
