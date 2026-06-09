# Restaurant Manager

A full-stack management system for small restaurants and eateries — more than a
point-of-sale. It unifies order processing, menu and recipe management,
inventory, customer store-credit ("utang") accounting, sales reporting, and
role-based staff access into a single web application.

## Description

Restaurant Manager is an all-in-one operations platform for small food
businesses such as restaurants, eateries, and carinderias. Instead of juggling a
cash register, a calculator, a stock notebook, and a paper utang ledger, owners
and staff run the entire front- and back-of-house workflow from one dashboard:
take orders at the counter, track ingredient-level inventory tied to recipes,
manage customer credit accounts, and review real-time sales — all behind secure,
role-based logins.

## Problem

Small restaurants and carinderias typically operate on a patchwork of manual
tools, which creates daily friction and lost money:

- **Manual checkout** — handwritten order slips and a calculator lead to math
  errors and miscounted sales.
- **No inventory visibility** — without real-time stock tracking, businesses hit
  surprise stockouts and waste spoiled ingredients.
- **Paper "utang" ledgers** — customer credit is tracked in a notebook, causing
  disputes, forgotten balances, and uncollected debt.
- **No sales insight** — there's no reliable data to guide pricing, purchasing,
  or staffing decisions.
- **No access control** — anyone behind the counter can see or change anything,
  with no accountability.

## Solution

Restaurant Manager replaces those scattered tools with one integrated system:

- **POS & Orders** — fast counter checkout and order taking.
- **Menu, Dishes & Recipes** — define dishes and the exact ingredients each one
  consumes.
- **Inventory** — ingredient-level stock tracking linked to recipes, so stock is
  accounted for as orders are made.
- **Store Credit (Utang)** — digital customer credit accounts with full
  transaction history and outstanding-balance tracking.
- **Dashboard & Reports** — real-time sales overview and historical reporting.
- **Users & Roles** — secure, role-based access with hashed-password
  authentication.

**Built with** Next.js 14 (App Router) and TypeScript, backed by MySQL, styled
with Tailwind CSS and shadcn/ui, and containerized with Docker for consistent
deployment.

## Impact

- **Eliminates manual math at checkout**, cutting sales and change-making errors.
- **Recipe-linked, real-time inventory** reduces stockouts and food waste.
- **Digitizes the utang ledger**, removing disputes and forgotten balances and
  improving debt collection.
- **Turns daily operations into actionable sales data** for smarter pricing and
  purchasing decisions.
- **Role-based access** protects sensitive data and limits each staff member to
  what their job requires.
- **Consolidates 4–5 disconnected manual tools into one system**, saving time
  every shift.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **UI:** Tailwind CSS, shadcn/ui (Radix UI), Recharts
- **Backend:** Next.js API routes, MySQL (`mysql2`), bcrypt authentication
- **Tooling & Deployment:** Docker, ESLint
