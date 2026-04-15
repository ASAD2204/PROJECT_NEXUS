from datetime import time

from fastapi import APIRouter, Depends, HTTPException, status
from ortools.sat.python import cp_model
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models import LmsSection, LmsTimetableSlot, SchedConstraint
from app.schemas import ConstraintCreate, ConstraintOut, GenerateOut, GenerateRequest, GeneratedSlot

router = APIRouter(prefix="/scheduler", tags=["Scheduler"])


@router.post("/constraints", response_model=ConstraintOut, status_code=status.HTTP_201_CREATED)
def create_constraint(
    payload: ConstraintCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("hod", "admin")),
):
    if payload.start_time >= payload.end_time:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")
    row = SchedConstraint(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/constraints", response_model=list[ConstraintOut])
def list_constraints(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("hod", "admin")),
):
    return db.query(SchedConstraint).order_by(SchedConstraint.constraint_id.desc()).all()


@router.post("/generate", response_model=GenerateOut)
def generate_timetable(
    payload: GenerateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("hod", "admin")),
):
    if payload.slot_minutes <= 0:
        raise HTTPException(status_code=400, detail="slot_minutes must be > 0")
    if payload.start_hour >= payload.end_hour:
        raise HTTPException(status_code=400, detail="start_hour must be < end_hour")

    sections = db.query(LmsSection).filter(LmsSection.section_id.in_(payload.section_ids)).all()
    section_map = {s.section_id: s for s in sections}
    missing = [sid for sid in payload.section_ids if sid not in section_map]
    if missing:
        raise HTTPException(status_code=404, detail=f"Sections not found: {missing}")

    # Candidate time slots.
    start_minute = payload.start_hour * 60
    end_minute = payload.end_hour * 60
    candidate_slots = []
    for day in payload.days_of_week:
        for minute in range(start_minute, end_minute - payload.slot_minutes + 1, payload.slot_minutes):
            candidate_slots.append((day, minute, minute + payload.slot_minutes))

    if not candidate_slots:
        return GenerateOut(created=[], unscheduled=[f"Section {sid}: no candidate slots" for sid in payload.section_ids])

    # Existing occupied pairs (section-independent conflicts).
    existing_rows = db.query(LmsTimetableSlot, LmsSection).join(LmsSection, LmsSection.section_id == LmsTimetableSlot.section_id).all()

    constraints = db.query(SchedConstraint).all()

    model = cp_model.CpModel()
    x = {}  # (section_id, slot_idx) -> bool var

    for sid in payload.section_ids:
        for idx in range(len(candidate_slots)):
            x[(sid, idx)] = model.NewBoolVar(f"x_{sid}_{idx}")

    # Each section exactly one slot.
    for sid in payload.section_ids:
        model.Add(sum(x[(sid, idx)] for idx in range(len(candidate_slots))) == 1)

    # Helper overlap.
    def overlap(a_start: int, a_end: int, b_start: int, b_end: int) -> bool:
        return a_start < b_end and b_start < a_end

    # Forbid choices that violate fixed constraints or existing timetable conflicts.
    for sid in payload.section_ids:
        sec = section_map[sid]
        for idx, (day, s_min, e_min) in enumerate(candidate_slots):
            slot_start = time(s_min // 60, s_min % 60)
            slot_end = time(e_min // 60, e_min % 60)

            invalid = False

            # User-defined constraints
            for c in constraints:
                if c.day_of_week != day:
                    continue
                c_start = c.start_time.hour * 60 + c.start_time.minute
                c_end = c.end_time.hour * 60 + c.end_time.minute
                if not overlap(s_min, e_min, c_start, c_end):
                    continue
                if c.resource_type == "faculty" and str(sec.faculty_id) == c.resource_id:
                    invalid = True
                    break
                if c.resource_type == "room" and sec.room_no and sec.room_no == c.resource_id:
                    invalid = True
                    break

            # Existing timetable conflicts
            if not invalid:
                for row, row_sec in existing_rows:
                    if row.day_of_week != day:
                        continue
                    row_start = row.start_time.hour * 60 + row.start_time.minute
                    row_end = row.end_time.hour * 60 + row.end_time.minute
                    if not overlap(s_min, e_min, row_start, row_end):
                        continue
                    if (sec.faculty_id is not None and row_sec.faculty_id == sec.faculty_id) or (
                        sec.room_no and row.room_no == sec.room_no
                    ):
                        invalid = True
                        break

            if invalid:
                model.Add(x[(sid, idx)] == 0)

    # In-batch no faculty/room conflicts.
    for i, sid_a in enumerate(payload.section_ids):
        sec_a = section_map[sid_a]
        for sid_b in payload.section_ids[i + 1 :]:
            sec_b = section_map[sid_b]
            same_faculty = sec_a.faculty_id is not None and sec_a.faculty_id == sec_b.faculty_id
            same_room = sec_a.room_no and sec_a.room_no == sec_b.room_no
            if not (same_faculty or same_room):
                continue
            for idx_a, (day_a, s_a, e_a) in enumerate(candidate_slots):
                for idx_b, (day_b, s_b, e_b) in enumerate(candidate_slots):
                    if day_a != day_b:
                        continue
                    if overlap(s_a, e_a, s_b, e_b):
                        model.Add(x[(sid_a, idx_a)] + x[(sid_b, idx_b)] <= 1)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 5.0
    status_code = solver.Solve(model)

    created = []
    unscheduled = []

    if status_code not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return GenerateOut(
            created=[],
            unscheduled=[
                "No conflict-free solution found. Relax constraints and retry."
            ],
        )

    for sid in payload.section_ids:
        sec = section_map[sid]
        chosen_idx = None
        for idx in range(len(candidate_slots)):
            if solver.Value(x[(sid, idx)]) == 1:
                chosen_idx = idx
                break
        if chosen_idx is None:
            unscheduled.append(f"Section {sid}: no slot selected")
            continue

        day, s_min, e_min = candidate_slots[chosen_idx]
        st = time(s_min // 60, s_min % 60)
        et = time(e_min // 60, e_min % 60)

        row = LmsTimetableSlot(
            section_id=sid,
            day_of_week=day,
            start_time=st,
            end_time=et,
            room_no=sec.room_no,
        )
        db.add(row)
        created.append(
            GeneratedSlot(
                section_id=sid,
                day_of_week=day,
                start_time=st,
                end_time=et,
                room_no=sec.room_no or "",
            )
        )

    db.commit()
    return GenerateOut(created=created, unscheduled=unscheduled)
