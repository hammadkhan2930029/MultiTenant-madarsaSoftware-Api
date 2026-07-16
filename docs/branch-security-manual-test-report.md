# Branch Security Manual Test Report

Use this checklist with a seeded Super Admin, two tenants, two branches in one tenant, and one Branch User assigned to only one branch.

## Access And Isolation

- Tenant Admin opens Branch Management and verifies only own tenant branches are visible.
- Tenant Admin tries another tenant branch URL ID in detail, update, delete, export, and report URLs; backend must return an authorization/not-found error.
- Branch User opens students, attendance, fees, store, exams, and reports; only assigned branch records should appear.
- Branch User changes `branchId` in query string, request body, browser devtools request replay, and export/report URLs; backend must not expose other branch data.
- Branch User changes `tenantId` in request body; backend must continue using authenticated tenant context.
- Branch User with inactive branch cannot login or access protected branch modules.
- User without module permission directly opens a protected URL/API; backend must deny and frontend must not render the screen.

## Branch Settings

- Super Admin can view tenant branch summary, created branch count, active/inactive branch count, and remaining limit.
- Tenant Admin cannot update branch enabled/limit settings.
- Branch disabled tenant does not show Branch Management in Tenant Admin sidebar.
- Branch disabled tenant cannot create branch through direct API.
- Limit decrease below current branch count does not delete data and returns validation error.
- Concurrent branch create attempts do not exceed allowed branch limit.

## Legacy And Tenant-Level Behavior

- Existing tenant-level admin can still view tenant-consolidated data.
- Existing records with no branch assignment remain unavailable to Branch Users until explicit migration/main-branch assignment.
- Super Admin uses only authorized Super Admin screens/APIs for all-tenant branch summaries.

## UI Regression Smoke

- Urdu font, RTL alignment, colors, spacing, cards, tables, buttons, and sidebar style remain unchanged.
- Branch Management menu appears only for enabled tenants and authorized Tenant Admins.
- Direct route navigation shows the existing unauthorized/blocked behavior.
- Mobile/sidebar responsive behavior remains stable.

## Current Automated Coverage

- `npm run test:branch-security`
- `npm run test:branch-edges`
- `npm run test:authz`
- `npm run test:tenants`
- `npm run test:users`
- `npm run test:login-rbac`
- Frontend production build: `npm run build`

Remaining risk: this manual report is a checklist; it does not replace a browser-based visual snapshot suite.
