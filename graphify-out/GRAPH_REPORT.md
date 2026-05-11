# Graph Report - POS System  (2026-05-11)

## Corpus Check
- 40 files · ~1,479,928 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 146 nodes · 279 edges · 17 communities (13 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6efdd190`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 22 edges
2. `useSettingsStore` - 21 edges
3. `POS System — Full-Featured Desktop Point of Sale` - 14 edges
4. `getDb()` - 10 edges
5. `formatCurrency()` - 8 edges
6. `formatDate()` - 6 edges
7. `todayStr()` - 5 edges
8. `initDatabase()` - 4 edges
9. `initDatabase()` - 4 edges
10. `ExpensesPage()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `TopBar()` --calls--> `useAuthStore`  [EXTRACTED]
  src/renderer/components/TopBar/TopBar.tsx → src/renderer/store/authStore.ts
- `RequireAuth()` --calls--> `useAuthStore`  [EXTRACTED]
  src/renderer/App.tsx → src/renderer/store/authStore.ts
- `App()` --calls--> `useSettingsStore`  [EXTRACTED]
  src/renderer/App.tsx → src/renderer/store/settingsStore.ts
- `Sidebar()` --calls--> `useAuthStore`  [EXTRACTED]
  src/renderer/components/Sidebar/Sidebar.tsx → src/renderer/store/authStore.ts
- `Sidebar()` --calls--> `useSettingsStore`  [EXTRACTED]
  src/renderer/components/Sidebar/Sidebar.tsx → src/renderer/store/settingsStore.ts

## Communities (17 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.19
Nodes (13): getDb(), initDatabase(), runMigrations(), seedDefaults(), registerCustomerHandlers(), registerExpenseHandlers(), registerProductHandlers(), registerReportHandlers() (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (23): 🏗️ Build & Package, Build Windows Installer (.exe), code:bash (# 1. Install all dependencies), code:bash (npm run dist:win), code:block3 (src/), code:csv (name,barcode,purchase_price,sale_price,stock_quantity,unit,m), code:bash (# Windows installer), code:bash (npm install --save-dev @electron/rebuild) (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.2
Nodes (18): createWindow(), Database, electron, fs, getDb(), initDatabase(), path, registerCustomerHandlers() (+10 more)

### Community 3 - "Community 3"
Cohesion: 0.2
Nodes (11): DashboardPage(), emptyForm, ExpensesPage(), ReportsPage(), Tab, TABS, formatCurrency(), formatDate() (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.22
Nodes (6): ModalProps, sizeClasses, POSPage(), CartItem, CartState, useCartStore

### Community 5 - "Community 5"
Cohesion: 0.29
Nodes (7): emptyForm, ProductsPage(), UNITS, SettingsState, useSettingsStore, emptySupplier, SuppliersPage()

### Community 6 - "Community 6"
Cohesion: 0.29
Nodes (5): AuthState, rolePermissions, User, pageTitles, TopBar()

### Community 7 - "Community 7"
Cohesion: 0.48
Nodes (4): LoginPage(), App(), RequireAuth(), useAuthStore

### Community 9 - "Community 9"
Cohesion: 0.4
Nodes (4): emptyUser, SettingsPage(), Tab, TABS

### Community 10 - "Community 10"
Cohesion: 0.4
Nodes (4): CustomersPage(), emptyForm, emptyPayment, formatDateTime()

## Knowledge Gaps
- **38 isolated node(s):** `ApiType`, `ModalProps`, `sizeClasses`, `navItems`, `pageTitles` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createWindow()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `useAuthStore` connect `Community 7` to `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `useSettingsStore` connect `Community 5` to `Community 3`, `Community 4`, `Community 7`, `Community 8`, `Community 9`, `Community 10`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `ApiType`, `ModalProps`, `sizeClasses` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._