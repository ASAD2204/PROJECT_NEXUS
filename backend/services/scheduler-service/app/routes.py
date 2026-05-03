import csv
import io
import json
from datetime import datetime, time

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from ortools.sat.python import cp_model
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models import LmsSection, LmsTimetableSlot, SchedConstraint, LmsCourse, SisFacultyAvailability, SchedTimetableSet
from app.schemas import ConstraintCreate, ConstraintOut, GenerateOut, GenerateRequest, GeneratedSlot, TimetableSetDetailOut, TimetableSetOut

router = APIRouter(prefix="/scheduler", tags=["Scheduler"])


def _serialize_slot(slot: GeneratedSlot) -> dict:
    return {
        "section_id": slot.section_id,
        "day_of_week": slot.day_of_week,
        "start_time": slot.start_time.isoformat(),
        "end_time": slot.end_time.isoformat(),
        "room_no": slot.room_no,
    }


def _deserialize_slot(raw: dict) -> GeneratedSlot:
    return GeneratedSlot(
        section_id=int(raw["section_id"]),
        day_of_week=str(raw["day_of_week"]),
        start_time=time.fromisoformat(raw["start_time"]),
        end_time=time.fromisoformat(raw["end_time"]),
        room_no=str(raw.get("room_no") or ""),
    )


def _save_timetable_set(
    db: Session,
    name: str,
    generated_by: str,
    created_slots: list[GeneratedSlot],
    program_id: int | None = None,
    semester_id: int | None = None,
    status_name: str = "draft",
) -> SchedTimetableSet:
    set_row = SchedTimetableSet(
        name=name,
        status=status_name,
        program_id=program_id,
        semester_id=semester_id,
        generated_by=generated_by,
        slots_json=json.dumps([_serialize_slot(slot) for slot in created_slots]),
    )
    db.add(set_row)
    db.flush()
    return set_row


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


@router.delete("/constraints/{constraint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_constraint(
    constraint_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("hod", "admin")),
):
    row = db.query(SchedConstraint).filter(SchedConstraint.constraint_id == constraint_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Constraint not found")
    db.delete(row)
    db.commit()
    return None


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

    sections = (
        db.query(LmsSection)
        .join(LmsCourse)
        .filter(LmsSection.section_id.in_(payload.section_ids))
        .all()
    )
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
    existing_rows = (
        db.query(LmsTimetableSlot, LmsSection)
        .join(LmsSection, LmsSection.section_id == LmsTimetableSlot.section_id)
        .all()
    )

    constraints = db.query(SchedConstraint).all()
    faculty_avail = db.query(SisFacultyAvailability).all()

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

            # Teacher specific availability from SisFacultyAvailability
            if not invalid:
                for fa in faculty_avail:
                    if fa.faculty_id != sec.faculty_id:
                        continue
                    if fa.day_of_week != day:
                        continue
                    fa_start = fa.start_time.hour * 60 + fa.start_time.minute
                    fa_end = fa.end_time.hour * 60 + fa.end_time.minute
                    
                    if overlap(s_min, e_min, fa_start, fa_end):
                        # if fa.is_available is False, it's a block. 
                        # if we want "only available in these times", it's more complex.
                        # User said "seeing the availability", so if there is a record for this time, 
                        # and is_available is False, it's invalid.
                        if not fa.is_available:
                            invalid = True
                            break

            # Global Break check (e.g. Lunch)
            if not invalid and payload.break_start_hour is not None and payload.break_end_hour is not None:
                b_start = payload.break_start_hour * 60
                b_end = payload.break_end_hour * 60
                if overlap(s_min, e_min, b_start, b_end):
                    invalid = True

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

    # In-batch no faculty/room/student conflicts.
    for i, sid_a in enumerate(payload.section_ids):
        sec_a = section_map[sid_a]
        for sid_b in payload.section_ids[i + 1 :]:
            sec_b = section_map[sid_b]
            
            same_faculty = sec_a.faculty_id is not None and sec_a.faculty_id == sec_b.faculty_id
            same_room = sec_a.room_no and sec_a.room_no == sec_b.room_no
            # Student Conflict: same program AND same semester
            same_batch = (sec_a.course.program_id is not None and sec_a.course.program_id == sec_b.course.program_id) and \
                         (sec_a.semester_id is not None and sec_a.semester_id == sec_b.semester_id)

            if not (same_faculty or same_room or same_batch):
                continue

            for idx_a, (day_a, s_a, e_a) in enumerate(candidate_slots):
                for idx_b, (day_b, s_b, e_b) in enumerate(candidate_slots):
                    if day_a != day_b:
                        continue
                    if overlap(s_a, e_a, s_b, e_b):
                        model.Add(x[(sid_a, idx_a)] + x[(sid_b, idx_b)] <= 1)

    # Max classes per day per batch (Program + Semester)
    if payload.max_classes_per_day:
        batches = {} # (prog_id, sem_id) -> [section_ids]
        for sid in payload.section_ids:
            sec = section_map[sid]
            key = (sec.course.program_id, sec.semester_id)
            if key not in batches: batches[key] = []
            batches[key].append(sid)
        
        for batch_key, b_sids in batches.items():
            for day in payload.days_of_week:
                # Sum of all sections of this batch on this day <= max_classes_per_day
                day_vars = []
                for sid in b_sids:
                    for idx, (d, _, _) in enumerate(candidate_slots):
                        if d == day:
                            day_vars.append(x[(sid, idx)])
                if day_vars:
                    model.Add(sum(day_vars) <= payload.max_classes_per_day)

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

    # Clear existing slots for these sections first to avoid duplicates
    db.query(LmsTimetableSlot).filter(LmsTimetableSlot.section_id.in_(payload.section_ids)).delete(synchronize_session=False)

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

    timetable_set_id = None
    if payload.save_as_draft and created:
        draft_name = payload.draft_name or f"Draft {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
        set_row = _save_timetable_set(
            db=db,
            name=draft_name,
            generated_by=str(current_user.get("user_id", "")),
            created_slots=created,
            program_id=payload.program_id,
            semester_id=payload.semester_id,
            status_name="draft",
        )
        timetable_set_id = set_row.set_id
    db.commit()
    return GenerateOut(created=created, unscheduled=unscheduled, timetable_set_id=timetable_set_id)


@router.get("/timetable-sets", response_model=list[TimetableSetOut])
def list_timetable_sets(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("hod", "admin")),
):
    rows = db.query(SchedTimetableSet).order_by(SchedTimetableSet.created_at.desc(), SchedTimetableSet.set_id.desc()).all()
    result = []
    for row in rows:
        slots = json.loads(row.slots_json or "[]")
        result.append(
            TimetableSetOut(
                set_id=row.set_id,
                name=row.name,
                status=row.status,
                program_id=row.program_id,
                semester_id=row.semester_id,
                generated_by=row.generated_by,
                created_at=row.created_at.isoformat() if row.created_at else None,
                created_count=len(slots),
            )
        )
    return result


@router.get("/timetable-sets/{set_id}", response_model=TimetableSetDetailOut)
def get_timetable_set(
    set_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("hod", "admin")),
):
    row = db.query(SchedTimetableSet).filter(SchedTimetableSet.set_id == set_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Timetable set not found")
    slots = [_deserialize_slot(raw) for raw in json.loads(row.slots_json or "[]")]
    return TimetableSetDetailOut(
        set_id=row.set_id,
        name=row.name,
        status=row.status,
        program_id=row.program_id,
        semester_id=row.semester_id,
        generated_by=row.generated_by,
        created_at=row.created_at.isoformat() if row.created_at else None,
        created_count=len(slots),
        created=slots,
    )


@router.post("/timetable-sets/{set_id}/publish", response_model=TimetableSetDetailOut)
def publish_timetable_set(
    set_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("hod", "admin")),
):
    row = db.query(SchedTimetableSet).filter(SchedTimetableSet.set_id == set_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Timetable set not found")
    slots = [_deserialize_slot(raw) for raw in json.loads(row.slots_json or "[]")]
    if not slots:
        raise HTTPException(status_code=400, detail="Timetable set has no generated slots")

    section_ids = [slot.section_id for slot in slots]
    db.query(LmsTimetableSlot).filter(LmsTimetableSlot.section_id.in_(section_ids)).delete(synchronize_session=False)

    for slot in slots:
        db.add(
            LmsTimetableSlot(
                section_id=slot.section_id,
                day_of_week=slot.day_of_week,
                start_time=slot.start_time,
                end_time=slot.end_time,
                room_no=slot.room_no or None,
            )
        )

    row.status = "published"
    db.commit()
    db.refresh(row)
    return TimetableSetDetailOut(
        set_id=row.set_id,
        name=row.name,
        status=row.status,
        program_id=row.program_id,
        semester_id=row.semester_id,
        generated_by=row.generated_by,
        created_at=row.created_at.isoformat() if row.created_at else None,
        created_count=len(slots),
        created=slots,
    )


@router.delete("/timetable-sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timetable_set(
    set_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("hod", "admin")),
):
    row = db.query(SchedTimetableSet).filter(SchedTimetableSet.set_id == set_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Timetable set not found")
    db.delete(row)
    db.commit()
    return None


@router.get("/timetable-sets/{set_id}/export")
def export_timetable_set(
    set_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("hod", "admin")),
):
    row = db.query(SchedTimetableSet).filter(SchedTimetableSet.set_id == set_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Timetable set not found")
    slots = [_deserialize_slot(raw) for raw in json.loads(row.slots_json or "[]")]

    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(["Section ID", "Day", "Start Time", "End Time", "Room"])
    for slot in slots:
        writer.writerow([slot.section_id, slot.day_of_week, slot.start_time.isoformat(), slot.end_time.isoformat(), slot.room_no])
    stream.seek(0)

    filename = f"timetable_set_{set_id}.csv"
    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
