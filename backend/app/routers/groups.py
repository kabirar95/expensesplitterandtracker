# ============================================================
# GROUPS ROUTER — Group Management API Endpoints
# ============================================================

import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends

from app.models.user import UserProfile
from app.models.group import Group, GroupMember
from app.schemas.group import (
    CreateGroupRequest,
    UpdateGroupRequest,
    AddMemberRequest,
    GroupResponse,
    GroupMemberResponse,
)
from app.middleware.auth import get_current_user
from app.database import get_supabase

router = APIRouter(prefix="/api/groups", tags=["Groups"])


def _group_to_response(group: dict) -> GroupResponse:
    """Helper to shape database dict into GroupResponse schema."""
    members = group.get("members", [])
    formatted_members = []
    for m in members:
        if isinstance(m, str):
            formatted_members.append(GroupMemberResponse(name=m, added_at=datetime.utcnow()))
        elif isinstance(m, dict):
            formatted_members.append(
                GroupMemberResponse(
                    name=m.get("name", ""),
                    added_at=m.get("added_at") or datetime.utcnow(),
                )
            )
    return GroupResponse(
        id=str(group.get("id")),
        name=group.get("name", ""),
        description=group.get("description"),
        category=group.get("category", "trip"),
        created_by=str(group.get("created_by")),
        members=formatted_members,
        created_at=group.get("created_at") or datetime.utcnow(),
        updated_at=group.get("updated_at") or datetime.utcnow(),
    )


# ── In-Memory / Database Group Store ──
# (Works with Supabase client or local fallback)
_local_groups_db = {}


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    data: CreateGroupRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Create a new expense group.
    Creator's display name is automatically included as the first member.
    """
    group_id = str(uuid.uuid4())
    
    # Ensure creator is in the members list
    member_names = list(dict.fromkeys([current_user.display_name] + data.members))
    members_data = [{"name": m, "added_at": datetime.utcnow().isoformat()} for m in member_names]

    new_group = {
        "id": group_id,
        "name": data.name,
        "description": data.description,
        "category": data.category,
        "created_by": str(current_user.id),
        "members": members_data,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("groups").insert(new_group).execute()
            if res.data:
                return _group_to_response(res.data[0])
        except Exception as e:
            print(f"Supabase write notice: {e}, using memory layer")

    _local_groups_db[group_id] = new_group
    return _group_to_response(new_group)


@router.get("", response_model=list[GroupResponse])
async def list_my_groups(current_user: UserProfile = Depends(get_current_user)):
    """
    List all groups created by or containing the logged-in user.
    """
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("groups").select("*").eq("created_by", str(current_user.id)).execute()
            if res.data:
                return [_group_to_response(g) for g in res.data]
        except Exception as e:
            print(f"Supabase read notice: {e}")

    user_groups = [
        g for g in _local_groups_db.values()
        if g.get("created_by") == str(current_user.id) or any(
            (m.get("name") if isinstance(m, dict) else m) == current_user.display_name
            for m in g.get("members", [])
        )
    ]
    return [_group_to_response(g) for g in user_groups]


@router.get("/{group_id}", response_model=GroupResponse)
async def get_group_detail(
    group_id: str,
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Get single group details by ID.
    """
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("groups").select("*").eq("id", group_id).execute()
            if res.data:
                return _group_to_response(res.data[0])
        except Exception as e:
            print(f"Supabase read notice: {e}")

    group = _local_groups_db.get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return _group_to_response(group)


@router.post("/{group_id}/members", response_model=GroupResponse)
async def add_group_member(
    group_id: str,
    data: AddMemberRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Add a member name to a group (no account required for members!).
    """
    group = _local_groups_db.get(group_id)
    
    supabase = get_supabase()
    if supabase and not group:
        try:
            res = supabase.table("groups").select("*").eq("id", group_id).execute()
            if res.data:
                group = res.data[0]
        except Exception as e:
            print(f"Supabase read notice: {e}")

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    existing_names = [m.get("name") if isinstance(m, dict) else m for m in group.get("members", [])]
    if data.name in existing_names:
        raise HTTPException(status_code=400, detail=f"Member '{data.name}' is already in this group")

    group["members"].append({"name": data.name, "added_at": datetime.utcnow().isoformat()})
    group["updated_at"] = datetime.utcnow().isoformat()

    if supabase:
        try:
            supabase.table("groups").update({"members": group["members"], "updated_at": group["updated_at"]}).eq("id", group_id).execute()
        except Exception as e:
            print(f"Supabase update notice: {e}")

    _local_groups_db[group_id] = group
    return _group_to_response(group)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: str,
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Delete a group and all its linked expenses (Cascade deletion).
    """
    supabase = get_supabase()
    if supabase:
        try:
            # Delete linked expenses first (or PostgreSQL CASCADE handles it)
            supabase.table("expenses").delete().eq("group_id", group_id).execute()
            supabase.table("groups").delete().eq("id", group_id).execute()
        except Exception as e:
            print(f"Supabase delete notice: {e}")

    _local_groups_db.pop(group_id, None)
    return None
