# Session handoff (read first)

This file carries context from the previous working session. Read it fully, then continue with the user.

## Where things stand

- Git: work from `feature/variant-improvements` (variants, Excel import, Sprint 21, security review) was committed and is meant to become the new `main`. The previous `main` (`64e5276`) is kept as the branch `MAIN-BACKUP-WORKING-PRE-DEF`. Always ask before committing, pushing or opening a PR.
- Real database: `ztg_db` on **XAMPP MariaDB 10.4.32**, `127.0.0.1:3307`, user `root` (see `backend/.env`; never print its values). Backups: `C:\Users\marti\ztg_db_backups\`.
- Production: frontend on Cloudflare Pages, backend at `https://ztg-pos-backend.onrender.com` (Docker, Apache mod_php, `start.sh` runs `migrate --force` on every deploy).
- Last verification: backend `php artisan test` all green (407 tests); frontend `npm run build` OK. The user tested in the browser: approval PIN + lockout, receipt XSS, notification View/highlight, mark-all-read badge, Inventory "All", search.
- Local PHP is now **8.2.35** (XAMPP). Backup of the old PHP: `C:\xampp\php_8.2.12_backup` (user may delete it). `C:\xampp\apache\conf\extra\httpd-xampp.conf` got `LoadFile "C:/xampp/php/libssh2.dll"` (backup `.bak_before_php8235`) to fix the libssh2 entry-point error.

## Open items for the user

- **PHP2Shell (CVE-2026-109618/109619):** production answered `x-powered-by: PHP/8.2.33` (vulnerable). The Dockerfile now pins `php:8.2.35-apache` and sets `expose_php = Off`; it takes effect on the next Render deploy (or "Clear build cache & deploy"). After the deploy, check System Status shows 8.2.35.
- Change the live `admin` and `techops` passwords (Profile > Change password; this also sets the PIN to the same value, the PIN can be changed after in Profile). The old defaults are in git history.
- Render: `APP_DEBUG=false`, `APP_ENV=production`. Optional `CORS_ALLOW_PREVIEW_ORIGINS=true` only while testing preview builds.
- BetterStack: point it at `https://ztg-pos-backend.onrender.com/up`.
- Leftovers not to commit: `semantic-review/`, `samples/~$*.xlsx` (Excel lock file), empty `ztg_baseline_main/`.

## Rules learned with this user (follow them)

- **Database changes:** read-only check first, then back up, rehearse on a scratch copy (`ztg_rehearsal_scratch`, created and dropped by you), and only then the real `ztg_db`. Never run `phpunit` against MySQL; tests use in-memory SQLite (`phpunit.xml`).
- The XAMPP server hosts other projects' databases. Only touch `ztg_db` and your own scratch database.
- Production quality: no browser popups, no debug console output, no raw emojis in the UI. Use `confirmDialog`, `showToast` and inline errors.
- Follow `.agents/AGENTS.md` (flag any change to what an existing test asserts) and `.agents/skills/ztg_development/SKILL.md` (thin controllers and services, Form Requests, `DB::transaction`, no queries in loops, modular folders, PHPDoc).
- Always run the backend tests and the frontend build before reporting done, and say clearly what was not checked in a browser.
- Never write a real password in chat or files. Point to where it can be found or give a reset method.
- **Shell on this PC is unreliable.** Read the memory `ztg-agent-shell-workarounds` first. Run commands one at a time (parallel calls run out of order); write a temp `.bat` that writes a DONE marker, poll it, read output files, delete temp files afterwards.
- Security and realtime rules from the review are in the memory `ztg-security-and-realtime-rules`.
- Explain things simply, step by step, with tables when useful. The user is learning.
