# Prompt 24 Two-Tenant Test Setup

This test setup is production-safe for local/QA use:

- It does not delete existing data.
- It creates or updates only records with `qa_p24_` tenant codes and `QA-P24` student admission numbers.
- It uses deterministic fake tenants: `jamia1` and `jamia2`.

## Run

```bash
npm run test:tenants
```

## Fake Tenants

| Tenant | Tenant Code | Subdomain | Admin Username | Admin Password |
| --- | --- | --- | --- | --- |
| Jamia 1 | `qa_p24_jamia1` | `jamia1` | `qa-p24-admin` | `Prompt24@123` |
| Jamia 2 | `qa_p24_jamia2` | `jamia2` | `qa-p24-admin` | `Prompt24@123` |

Both admins intentionally use the same email and username to verify tenant-wise uniqueness.

## Checks Covered

- Both tenant admins can login separately.
- Login token tenant IDs match the tenant context.
- Jamia 1 student list contains only Jamia 1 records.
- Jamia 2 student list contains only Jamia 2 records.
- The same student name is allowed in both tenants.
- The same admission number is allowed in both tenants.
- Direct `tenantId` tampering in student create/update payload is ignored.
- Cross-tenant student fetch returns `404`.

## Expected Result

The script prints `PASS` for every check and exits with code `0`.
