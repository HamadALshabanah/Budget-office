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

    # 1b. create_all never alters existing tables - add the FK columns ourselves
    for table in ("invoices", "category_rules"):
        cols = {r[1] for r in con.execute(f"PRAGMA table_info({table})")}
        if "category_id" not in cols:
            con.execute(f"ALTER TABLE {table} ADD COLUMN category_id INTEGER REFERENCES categories(id)")
            print(f"added category_id to {table}")

    # 2. seed the tree from distinct trimmed strings
    roots: dict[tuple[int, str], int] = {}     # (user_id, classification) -> id
    mains: dict[tuple[int, str, str], int] = {}  # (user_id, classification, main) -> id

    for (user_id, cls) in con.execute(
        "SELECT DISTINCT user_id, TRIM(classification) FROM invoices "
        "WHERE TRIM(classification) != '' "
        "UNION SELECT DISTINCT user_id, TRIM(classification) FROM category_rules "
        "WHERE TRIM(classification) != ''"
    ):
        roots[(user_id, cls)] = get_or_create(con, user_id, None, cls, 0)

    for (user_id, cls, mc) in con.execute(
        "SELECT DISTINCT user_id, TRIM(classification), TRIM(main_category) FROM invoices "
        "WHERE TRIM(COALESCE(classification,'')) != '' AND TRIM(COALESCE(main_category,'')) != '' "
        "UNION SELECT DISTINCT user_id, TRIM(classification), TRIM(main_category) FROM category_rules "
        "WHERE TRIM(COALESCE(classification,'')) != '' AND TRIM(COALESCE(main_category,'')) != ''"
    ):
        mains[(user_id, cls, mc)] = get_or_create(con, user_id, roots[(user_id, cls)], mc, 1)

    subs = 0
    for (user_id, cls, mc, sc) in con.execute(
        "SELECT DISTINCT user_id, TRIM(classification), TRIM(main_category), TRIM(sub_category) "
        "FROM invoices WHERE TRIM(COALESCE(sub_category,'')) != '' "
        "UNION SELECT DISTINCT user_id, TRIM(classification), TRIM(main_category), TRIM(sub_category) "
        "FROM category_rules WHERE TRIM(COALESCE(sub_category,'')) != ''"
    ):
        get_or_create(con, user_id, mains[(user_id, cls, mc)], sc, 2)
        subs += 1

    n_nodes = con.execute("SELECT COUNT(*) FROM categories").fetchone()[0]
    print(f"seeded tree: {len(roots)} root(s), {len(mains)} main(s), {subs} sub(s) = {n_nodes} nodes")

    # 3+4. backfill FKs ('' or NULL sub -> attach to the main node; all-NULL rows stay NULL)
    def resolve(user_id, cls, mc, sc):
        if not cls or not mc:
            return None
        main_id = mains[(user_id, cls, mc)]
        if not sc:
            return main_id
        row = con.execute(
            "SELECT id FROM categories WHERE parent_id = ? AND name = ?",
            (main_id, sc),
        ).fetchone()
        return row[0] if row else None

    inv_filled = rule_filled = 0
    for (rid, user_id, cls, mc, sc) in con.execute(
        "SELECT id, user_id, TRIM(COALESCE(classification,'')), "
        "TRIM(COALESCE(main_category,'')), TRIM(COALESCE(sub_category,'')) FROM invoices"
    ):
        cid = resolve(user_id, cls, mc, sc)
        if cid:
            con.execute("UPDATE invoices SET category_id = ? WHERE id = ?", (cid, rid))
            inv_filled += 1

    for (rid, user_id, cls, mc, sc) in con.execute(
        "SELECT id, user_id, TRIM(classification), "
        "TRIM(COALESCE(main_category,'')), TRIM(COALESCE(sub_category,'')) FROM category_rules"
    ):
        cid = resolve(user_id, cls, mc, sc)
        if cid:
            con.execute("UPDATE category_rules SET category_id = ? WHERE id = ?", (cid, rid))
            rule_filled += 1

    con.commit()
    print(f"backfilled: {inv_filled} invoices, {rule_filled} rules")

    # 5. verify before any destructive step
    expected_inv = con.execute(
        "SELECT COUNT(*) FROM invoices WHERE TRIM(COALESCE(classification,'')) != '' "
        "AND TRIM(COALESCE(main_category,'')) != ''"
    ).fetchone()[0]
    assert inv_filled == expected_inv, f"invoice mismatch: {inv_filled} != {expected_inv}"
    assert rule_filled == con.execute("SELECT COUNT(*) FROM category_rules").fetchone()[0]
    orphans = con.execute(
        "SELECT COUNT(*) FROM invoices WHERE category_id IS NULL "
        "AND TRIM(COALESCE(main_category,'')) != ''"
    ).fetchone()[0]
    assert orphans == 0, f"{orphans} rows left uncategorized despite having strings"
    print("verify: OK (every categorized row points at a real node)")

    # 6. drop old columns
    drops = [
        ("invoices", "main_category"), ("invoices", "sub_category"),
        ("category_rules", "main_category"), ("category_rules", "sub_category"),
    ]
    if drop_classification:
        drops += [("invoices", "classification"), ("category_rules", "classification")]

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
