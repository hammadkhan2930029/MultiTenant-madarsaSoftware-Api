# Affiliate System - Production Deployment Runbook

This runbook deploys the Affiliate/Referral Wallet feature without modifying existing tenant records directly.

## 1. Pre-deployment backup

Use the database name and user configured for the live API. Do not write the database password in a command or source file.

```bash
mkdir -p ~/db-backups
mysqldump -u LIVE_DB_USER -p --single-transaction --routines --triggers LIVE_DB_NAME > ~/db-backups/before-affiliate-$(date +%Y%m%d-%H%M%S).sql
```

Confirm that the backup exists and is not empty:

```bash
ls -lh ~/db-backups/
```

## 2. Deploy backend code

```bash
cd ~/appapi.madrasasoftware.com
npm install
npx prisma validate
npx prisma migrate deploy
npx prisma generate
```

Never run `prisma migrate dev`, `prisma db push`, or `prisma migrate reset` on production.

## 3. Verify database and financial invariants

```bash
npm run verify:affiliate
```

Both commands must return `success: true`:

- `check:affiliate-deployment`: required tables, columns, indexes, and migrations.
- `test:affiliate`: tenant links, commissions, payment accounts, withdrawals, payments, and balances.
- `test:affiliate-http-security`: verifies that every protected Affiliate HTTP endpoint rejects unauthenticated requests.
- `test:affiliate-role-boundaries`: verifies Super Admin, main Tenant Admin, and branch-user access boundaries with authenticated test tokens.
- `test:affiliate-write-boundaries`: verifies authenticated write authorization and confirms denied/invalid requests create no financial records.
- `test:affiliate-commission-model`: verifies Model-A tier snapshots and commission calculation inside a transaction that is always rolled back.
- `test:affiliate-withdrawal-rules`: verifies withdrawal limits, account snapshots, and balance protections inside a transaction that is always rolled back.

## 4. Restart the API

Use the process mechanism already configured on the server. Examples:

```bash
pm2 restart all
```

or, when the application is managed by cPanel/Passenger, use its existing restart control. Do not start a second API process on the same port.

## 5. Deploy frontend

Build the React project in its frontend directory and upload/deploy the generated `dist` directory through the existing frontend process.

```bash
npm install
npm run build
```

Do not upload frontend `.env` files containing secrets. Only public frontend environment variables belong in a frontend build.

## 6. Manual acceptance checks

1. Super Admin creates an active commission tier.
2. Super Admin creates a tenant with a referral code and optional sale amount/currency.
3. Affiliate overview shows the referrer and referred tenant.
4. Main Tenant Admin sees the wallet; a branch user does not.
5. Tenant Admin adds a payment account and submits a withdrawal request.
6. Super Admin rejects a test request or records its real manual payment.
7. Tenant wallet moves a paid request from pending to paid and recalculates available balance.
8. Run `npm run verify:affiliate` again.

Do not mark a withdrawal as paid until the manual payment has actually been sent.

## 7. Safe rollback

If application code has an issue but migrations completed successfully:

1. Put the site in maintenance mode if the existing hosting workflow supports it.
2. Re-deploy the previous backend and frontend release.
3. Do not manually drop Affiliate tables or columns.
4. Keep the database migration history and newly recorded financial data intact.
5. Diagnose and roll forward with a corrected release.

Restore the database backup only for a confirmed data-corruption incident and only after preserving a backup of the current database. A database restore removes all changes made after the backup, including legitimate tenant activity.

## 8. Required successful output

```text
check:affiliate-deployment  success: true
test:affiliate              11 checks passed, 0 failed
test:affiliate-http-security protected endpoint checks passed, 0 failed
test:affiliate-role-boundaries authenticated role checks passed, 0 failed
test:affiliate-write-boundaries authenticated write checks passed, 0 failed
test:affiliate-commission-model rollback-only calculation checks passed, 0 failed
test:affiliate-withdrawal-rules rollback-only withdrawal checks passed, 0 failed
```

Any missing migration, table, index, tenant-link mismatch, duplicate payment, or overdrawn balance must block the production rollout.
