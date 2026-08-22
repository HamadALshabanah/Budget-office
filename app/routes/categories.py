from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, text

from app.deps import get_current_user_or_apikey
from app.db import get_db_session
from app.models.Category import Category
from app.models.Invoice import Invoice
from app.models.Rule import Rule as CategoryRule
from schema import CategoryCreateReq

router = APIRouter(prefix="/categories", tags=["categories"])


def node_dict(n: Category, children=None):
    d = {"id": n.id, "name": n.name, "parent_id": n.parent_id,
         "level": n.level, "category_limit": n.category_limit}
    if children is not None:
        d["children"] = children
    return d


def get_node(db, category_id: int, user_id: int) -> Category:
    node = db.query(Category).filter_by(id=category_id, user_id=user_id).first()
    if not node:
        raise HTTPException(404, "Category not found")
    return node


def subtree_ids(db, category_id: int) -> list[int]:
    """This category plus all descendants, in one recursive query."""
    return db.execute(text(
        "WITH RECURSIVE t(id) AS (SELECT :id "
        "UNION ALL SELECT c.id FROM categories c JOIN t ON c.parent_id = t.id) "
        "SELECT id FROM t"
    ), {"id": category_id}).scalars().all()


def spent(db, user_id: int, ids) -> tuple[float, int]:
    """(total, count) of successful invoices in these categories."""
    total, count = db.query(func.sum(Invoice.amount), func.count(Invoice.id)).filter(
        Invoice.category_id.in_(ids),
        Invoice.extraction_status == "success",
        Invoice.user_id == user_id,
    ).first()
    return round(total or 0, 2), count or 0


@router.get("/")
def category_tree(user=Depends(get_current_user_or_apikey), db=Depends(get_db_session)):
    nodes = db.query(Category).filter_by(user_id=user.id).order_by(Category.name).all()
    by_id = {n.id: node_dict(n, []) for n in nodes}
    roots = [by_id[n.id] for n in nodes if n.parent_id not in by_id]
    for n in nodes:
        if n.parent_id in by_id:
            by_id[n.parent_id]["children"].append(by_id[n.id])
    return roots


@router.get("/root")  # must stay above /{category_id}
def root_categories(user=Depends(get_current_user_or_apikey), db=Depends(get_db_session)):
    return [node_dict(n) for n in
            db.query(Category).filter_by(user_id=user.id, level=1).order_by(Category.name)]


@router.get("/{category_id}")
def get_category(category_id: int, user=Depends(get_current_user_or_apikey), db=Depends(get_db_session)):
    node = get_node(db, category_id, user.id)
    children = db.query(Category).filter_by(parent_id=node.id, user_id=user.id).order_by(Category.name)
    return node_dict(node, [node_dict(c) for c in children])


@router.get("/{category_id}/ancestors")
def category_ancestors(category_id: int, user=Depends(get_current_user_or_apikey), db=Depends(get_db_session)):
    path, node = [], get_node(db, category_id, user.id)
    while node:
        path.append({"id": node.id, "name": node.name, "level": node.level})
        node = db.get(Category, node.parent_id) if node.parent_id else None
    return path[::-1]


@router.get("/{category_id}/analysis")
def category_analysis(category_id: int, user=Depends(get_current_user_or_apikey), db=Depends(get_db_session)):
    node = get_node(db, category_id, user.id)
    total, count = spent(db, user.id, subtree_ids(db, category_id))
    return {
        "category_id": node.id,
        "name": node.name,
        "total_spent": total,
        "invoice_count": count,
        "average_spent": round(total / count, 2) if count else 0,
        "category_limit": node.category_limit,
    }


@router.get("/{category_id}/breakdown")
def category_breakdown(category_id: int, user=Depends(get_current_user_or_apikey), db=Depends(get_db_session)):
    node = get_node(db, category_id, user.id)
    direct_spent, _ = spent(db, user.id, [node.id])
    children = []
    for c in db.query(Category).filter_by(parent_id=node.id, user_id=user.id).order_by(Category.name):
        total, count = spent(db, user.id, subtree_ids(db, c.id))
        children.append({**node_dict(c), "spent": total, "count": count})
    return {"category_id": node.id, "name": node.name, "direct_spent": direct_spent, "children": children}


@router.post("/", status_code=201)
def create_category(req: CategoryCreateReq, user=Depends(get_current_user_or_apikey), db=Depends(get_db_session)):
    parent = None
    if req.parent_id is not None:
        parent = get_node(db, req.parent_id, user.id)
    if db.query(Category).filter_by(parent_id=req.parent_id, name=req.name, user_id=user.id).first():
        raise HTTPException(409, "Name already exists under this parent")
    node = Category(name=req.name, parent_id=req.parent_id, user_id=user.id,
                    level=parent.level + 1 if parent else 0, category_limit=req.category_limit)
    db.add(node)
    db.commit()
    db.refresh(node)
    return node_dict(node)


@router.patch("/{category_id}")
def update_category(category_id: int, req: CategoryCreateReq, user=Depends(get_current_user_or_apikey), db=Depends(get_db_session)):
    node = get_node(db, category_id, user.id)
    parent = get_node(db, req.parent_id, user.id) if req.parent_id is not None else None
    dup = db.query(Category).filter_by(parent_id=req.parent_id, name=req.name, user_id=user.id).first()
    if dup and dup.id != node.id:
        raise HTTPException(409, "Name already exists under this parent")
    node.name = req.name
    node.parent_id = req.parent_id
    node.category_limit = req.category_limit
    node.level = parent.level + 1 if parent else 0
    db.commit()
    db.refresh(node)
    return node_dict(node)


@router.delete("/{category_id}")
def delete_category(category_id: int, user=Depends(get_current_user_or_apikey), db=Depends(get_db_session)):
    node = get_node(db, category_id, user.id)
    db.query(Category).filter_by(parent_id=node.id).update({Category.parent_id: node.parent_id})
    db.query(Invoice).filter_by(category_id=node.id).update({Invoice.category_id: None})
    db.query(CategoryRule).filter_by(category_id=node.id).update({CategoryRule.category_id: None})
    db.delete(node)
    db.commit()
    return {"status": f"Category '{node.name}' deleted"}
