"""One-shot migration: flat category strings -> categories tree.

Run from the repo root:  python3 migrate_categories.py
Add --drop-classification to also remove the flat classification columns
(only do this once no code reads Invoice.classification / Rule.classification).

Safe to re-run: nodes are get-or-create'd on (user_id, parent_id, name),
and the backup file is never overwritten.
"""
import os
import shutil
import sqlite3
import sys

from app.db import engine, Base
import app.models.Category  # registers the categories table on Base metadata

DB = os.environ.get("SQLITE_PATH", "invoices.db")  # honors the container's /data path
BACKUP = DB + ".bak"


def norm(v: str | None) -> str:
    return v.strip() if isinstance(v, str) else ""


def get_or_create(con, user_id, parent_id, name, level) -> int:
    row = con.execute(
        "SELECT id FROM categories WHERE user_id = ? AND parent_id IS ? AND name = ?",
        (user_id, parent_id, name),
    ).fetchone()
    if row:
        return row[0]
    cur = con.execute(
        "INSERT INTO categories (name, parent_id, level, user_id) VALUES (?, ?, ?, ?)",
        (name, parent_id, level, user_id),
    )
    return cur.lastrowid


def main():
    drop_classification = "--drop-classification" in sys.argv

    if not os.path.exists(BACKUP):
        shutil.copy2(DB, BACKUP)
        print(f"backup created: {BACKUP}")
    else:
        print(f"backup kept as-is: {BACKUP}")

    # 1. create missing tables (categories); existing tables are untouched
    Base.metadata.create_all(engine)

    con = sqlite3.connect(DB)

    # 1b. create_all never alters existing tables - sync any missing columns ourselves
    wanted = {
        "invoices": [
            ("category_id", "INTEGER REFERENCES categories(id)"),
            ("note", "TEXT"),
        ],
        "category_rules": [
            ("category_id", "INTEGER REFERENCES categories(id)"),
        ],
    }
    for table, cols_wanted in wanted.items():
        cols = {r[1] for r in con.execute(f"PRAGMA table_info({table})")}
        for name, decl in cols_wanted:
            if name not in cols:
                con.execute(f"ALTER TABLE {table} ADD COLUMN {name} {decl}")
                print(f"added {name} to {table}")

    # which legacy flat columns does each table have? vintages can differ per table
    def cols_of(table):
        return {r[1] for r in con.execute(f"PRAGMA table_info({table})")}

    inv_cols = cols_of("invoices")
    rule_cols = cols_of("category_rules")

    inv_flat = {"classification", "main_category"} <= inv_cols
    rule_flat = {"classification", "main_category"} <= rule_cols

    if not inv_flat and not rule_flat:
        # fresh DB or already-migrated: nothing flat to convert
        con.commit()
        print("no legacy flat category columns found - tree seeding skipped")
        print("done.")
        return
    if not rule_flat:
        print("note: category_rules has no flat category columns - rules won't be auto-linked")

    # 2. seed the tree from distinct trimmed strings, per available source
    roots: dict[tuple[int, str], int] = {}       # (user_id, classification) -> id
    mains: dict[tuple[int, str, str], int] = {}  # (user_id, classification, main) -> id

    flat_tables = [t for t, ok in (("invoices", inv_flat), ("category_rules", rule_flat)) if ok]
    sub_tables = [t for t in ("invoices", "category_rules")
                  if (inv_cols if t == "invoices" else rule_cols).issuperset({"sub_category"})]

    for t in flat_tables:
        for (user_id, cls) in con.execute(
            f"SELECT DISTINCT user_id, TRIM(classification) FROM {t} "
            "WHERE TRIM(COALESCE(classification,'')) != ''"
        ):
            if (user_id, cls) not in roots:
                roots[(user_id, cls)] = get_or_create(con, user_id, None, cls, 0)

    for t in flat_tables:
        for (user_id, cls, mc) in con.execute(
            f"SELECT DISTINCT user_id, TRIM(classification), TRIM(main_category) FROM {t} "
            "WHERE TRIM(COALESCE(classification,'')) != '' AND TRIM(COALESCE(main_category,'')) != ''"
        ):
            if (user_id, cls, mc) not in mains:
                mains[(user_id, cls, mc)] = get_or_create(con, user_id, roots[(user_id, cls)], mc, 1)

    subs = 0
    for t in sub_tables:
        for (user_id, cls, mc, sc) in con.execute(
            f"SELECT DISTINCT user_id, TRIM(classification), TRIM(main_category), TRIM(sub_category) FROM {t} "
            "WHERE TRIM(COALESCE(sub_category,'')) != ''"
        ):
            if (user_id, cls, mc) not in mains:
                print(f"skipping dirty row in {t}: user {user_id} has sub '{sc}' without main '{mc}'")
                continue
            get_or_create(con, user_id, mains[(user_id, cls, mc)], sc, 2)
            subs += 1

    n_nodes = con.execute("SELECT COUNT(*) FROM categories").fetchone()[0]
    print(f"seeded tree: {len(roots)} root(s), {len(mains)} main(s), {subs} sub(s) = {n_nodes} nodes")

    # 3+4. backfill FKs ('' or NULL sub -> attach to the main node; all-NULL rows stay NULL)
    def resolve(user_id, cls, mc, sc):
        if not cls or not mc or (user_id, cls, mc) not in mains:
            return None
        if not sc:
            return mains[(user_id, cls, mc)]
        row = con.execute(
            "SELECT id FROM categories WHERE parent_id = ? AND name = ?",
            (mains[(user_id, cls, mc)], sc),
        ).fetchone()
        return row[0] if row else None

    inv_filled = rule_filled = 0
    if inv_flat:
        sub_expr = "TRIM(COALESCE(sub_category,''))" if "sub_category" in inv_cols else "''"
        for (rid, user_id, cls, mc, sc) in con.execute(
            f"SELECT id, user_id, TRIM(COALESCE(classification,'')), "
            f"TRIM(COALESCE(main_category,'')), {sub_expr} FROM invoices"
        ):
            cid = resolve(user_id, cls, mc, sc)
            if cid:
                con.execute("UPDATE invoices SET category_id = ? WHERE id = ?", (cid, rid))
                inv_filled += 1

    if rule_flat:
        sub_expr = "TRIM(COALESCE(sub_category,''))" if "sub_category" in rule_cols else "''"
        for (rid, user_id, cls, mc, sc) in con.execute(
            f"SELECT id, user_id, TRIM(classification), "
            f"TRIM(COALESCE(main_category,'')), {sub_expr} FROM category_rules"
        ):
            cid = resolve(user_id, cls, mc, sc)
            if cid:
                con.execute("UPDATE category_rules SET category_id = ? WHERE id = ?", (cid, rid))
                rule_filled += 1

    con.commit()
    print(f"backfilled: {inv_filled} invoices, {rule_filled} rules")

    # 5. verify before any destructive step
    if inv_flat:
        expected_inv = con.execute(
            "SELECT COUNT(*) FROM invoices WHERE TRIM(COALESCE(classification,'')) != '' "
            "AND TRIM(COALESCE(main_category,'')) != ''"
        ).fetchone()[0]
        assert inv_filled == expected_inv, f"invoice mismatch: {inv_filled} != {expected_inv}"
        orphans = con.execute(
            "SELECT COUNT(*) FROM invoices WHERE category_id IS NULL "
            "AND TRIM(COALESCE(main_category,'')) != ''"
        ).fetchone()[0]
        assert orphans == 0, f"{orphans} rows left uncategorized despite having strings"
    if rule_flat:
        expected_rules = con.execute(
            "SELECT COUNT(*) FROM category_rules WHERE TRIM(COALESCE(classification,'')) != '' "
            "AND TRIM(COALESCE(main_category,'')) != ''"
        ).fetchone()[0]
        assert rule_filled == expected_rules, f"rule mismatch: {rule_filled} != {expected_rules}"
    print("verify: OK (every categorized row points at a real node)")

    # 6. drop old columns (only ones this DB actually has)
    drops = [
        (t, c)
        for t, cols in (("invoices", inv_cols), ("category_rules", rule_cols))
        for c in ("main_category", "sub_category") if c in cols
    ]
    if drop_classification:
        drops += [
            (t, "classification")
            for t, cols in (("invoices", inv_cols), ("category_rules", rule_cols))
            if "classification" in cols
        ]

    version = tuple(int(x) for x in sqlite3.sqlite_version.split(".")[:2])
    if version < (3, 35):
        print(f"sqlite {sqlite3.sqlite_version} can't DROP COLUMN (needs >= 3.35) - data is migrated, columns kept")
    else:
        for table, col in drops:
            con.execute(f"ALTER TABLE {table} DROP COLUMN {col}")
        con.commit()
        print(f"dropped {len(drops)} old column(s): " + ", ".join(f"{t}.{c}" for t, c in drops))

    print("done.")


if __name__ == "__main__":
    main()
