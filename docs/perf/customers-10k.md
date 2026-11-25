# 10,000 Customers Performance Benchmark & Optimization Report

## Environment & Test Harness
- **Database**: PostgreSQL 19 (`nsmisp`, `UTF8`, `datcollate = C`, `datctype = C`)
- **Dataset**: 10,000 synthetic bilingual customers (`60%` Khmer + Latin, `20%` Khmer-only, `20%` Latin-only) seeded deterministically via `npm run db:seed:customers -- --count=10000 --seed=42`.
- **Production Runtime**: `NODE_ENV=production` compiled backend (`dist-server/server.js`) + `vite preview` static production bundle (`dist/`).
- **Load Profile**: 100 HTTP requests per scenario at concurrency `10` (`3` warmup requests), plus headless Chromium UI instrumentation (`1440×900`).

---

## Before vs. After Production Metrics

| Metric | Target | Baseline (Full Client Load) | After (Server Pagination + GIN/B-Tree Indexes) | Improvement |
|---|---:|---:|---:|---:|
| **List customers HTTP p95** | `< 300 ms` | `3,470.30 ms` | `48.60 ms` | **71.4× faster** |
| **List customers HTTP p50** | — | `2,409.43 ms` | `11.09 ms` | **217.3× faster** |
| **List throughput (RPS)** | — | `4.1 req/s` | `656.8 req/s` | **160.2× higher** |
| **List payload size** | `< 1,024 KB` | `5,682.7 KB` (`10,000` rows) | `14.2 KB` (`25` rows) | **400× smaller** |
| **Search Latin (`Sokha`) HTTP p95** | `< 500 ms` | `3,153.13 ms` | `20.40 ms` | **154.6× faster** |
| **Search Khmer (`សុខា`) HTTP p95** | `< 500 ms` | `3,331.14 ms` | `41.18 ms` | **80.9× faster** |
| **UI First Render (`/customers`)** | `< 1,500 ms` | `1,222.6 ms` | `455.8 ms` | **2.68× faster** |
| **Browser JS Heap Used** | — | `123.6 MB` | `28.2 MB` | **4.38× lower** |

> **Note on browser interaction measurements**: The benchmark script includes an explicit `350 ms` wait after filling search (`searchUiMs: 376.7 ms`, ~`26.7 ms` actual UI delta) and `50 ms` sleeps around sort/page clicks (`pageUiMs: 122.7 ms`, `sortUiMs: 210.9 ms`), well within interactive responsiveness targets once network roundtrips complete.

---

## SQL Query Plans (`EXPLAIN (ANALYZE, BUFFERS)`)

### Baseline
- `SELECT ... FROM "Customer" ORDER BY "createdAt" DESC`: `9.270 ms` (`Seq Scan` across all 10,000 rows), followed by loading all 10,000 nested `Address`, `Subscription`, `Package`, and `PPPoEAccount` graphs into Node.js memory and serializing `5.68 MB` JSON on every request.
- Khmer `ILIKE '%សុខា%' ORDER BY "createdAt" DESC LIMIT 25`: `7.265 ms` (`Seq Scan`, removing 9,887 rows).

### After Phase 5 (`20261125200000_customer_search_trgm_indexes`)
- **Paginated Page 1 (`ORDER BY "createdAt" DESC LIMIT 25`)**:
  - Plan: `Limit -> Index Scan using "Customer_createdAt_idx" on "Customer"`
  - Execution Time: **`0.078 ms`** (`Buffers: shared hit=26`)
- **Khmer Substring Search (`ILIKE '%សុខា%' ORDER BY "createdAt" DESC LIMIT 25`, `enable_seqscan = off`)**:
  - Plan: `Limit -> Index Scan using "Customer_createdAt_idx"` with trigram/filter
  - Execution Time: **`4.622 ms`** (`Buffers: shared hit=2157 read=4`)
- **Latin Substring Search (`ILIKE '%Sokha%' ORDER BY "createdAt" DESC LIMIT 25`, `enable_seqscan = off`)**:
  - Execution Time: **`3.845 ms`** (`Buffers: shared hit=2186`)
- **Khmer `COUNT(*)`**:
  - Execution Time: **`11.757 ms`** (`Buffers: shared hit=253`, 2 MB heap cached in shared buffers).

---

## Root Causes Fixed
1. **Eliminated full-table 10k hydration**: `CustomerService.listCustomers` (`server/src/services/customer.service.ts`) now pushes `status`, `plan`, `city`, `connectionType`, `balanceDue`, `sortBy`/`sortDir`, and NFC-normalized `search` down into SQL with `skip`/`take`, returning `{ items, total, page, limit, totalPages }` (`~14 KB` for 25 rows, `~5.5 KB` for 10 rows).
2. **Kept text search on single-table GIN columns**: `buildCustomerWhere` restricts `PPPoEAccount` (`ipAddress` / `macAddress`) joins strictly to IP/MAC-shaped queries so normal Latin and Khmer searches stay fast on `Customer`.
3. **Separated aggregate KPI & facet queries**: Added `GET /api/v1/customers/stats` (`CustomerService.getCustomerStats`) using `groupBy` + SQL `DISTINCT ON` MRR aggregate so `CustomersPage`, `StatusTabs`, `DashboardPage`, and `ReportsPage` never download 10,000 rows just to count statuses or compute MRR.
4. **Added database indexes (`20261125200000_customer_search_trgm_indexes`)**:
   - Enabled `pg_trgm`.
   - Added `Customer_createdAt_idx` (`DESC`) and 6 `GIN (gin_trgm_ops)` indexes on `"nameKm"`, `"nameEn"`, `"fullName"`, `"email"`, `"phone"`, and `"code"`.
5. **Wired `DataTable` `serverMode` + TanStack Query**: `CustomersPage` & `CustomerTable` now fetch paged data via `useQuery` with `keepPreviousData`, `120 ms` search debounce, `AbortSignal` cancellation, and `DataTable` skeleton/overlay loading states.

---

## Collation Findings & Proposal (`C` vs. `km-KH-x-icu`)
- The PostgreSQL `nsmisp` database uses `encoding = UTF8`, `datcollate = C`, `datctype = C`.
- PostgreSQL 19 has ICU collations `km-x-icu` and `km-KH-x-icu` (`collprovider = 'i'`) available.
- **Impact**: Under `C` collation, `ORDER BY "nameKm"` sorts strictly by UTF-8 byte / Unicode codepoint order rather than Khmer dictionary order (e.g., vowel/subscript ordering). Because `Customer` defaults to `createdAt DESC` or `fullName` (Latin-primary), `C` avoids ICU overhead on B-tree equality/prefix lookups.
- **Proposal**: If Khmer-alphabetical sorting becomes a primary user requirement, add an expression index or column collation `COLLATE "km-KH-x-icu"` on `"nameKm"` in a dedicated migration without changing the database-wide `C` locale.
