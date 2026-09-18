from models import db, DentalEntry, Doctor, Hospital
from datetime import datetime, date
from sqlalchemy import func, or_, and_
import calendar
from sqlalchemy.exc import IntegrityError
import secrets


def generate_entry_no():
    today = datetime.utcnow().strftime('%y%m%d')
    suffix = secrets.token_hex(3)
    return f"ENTRY-{today}-{suffix}"


def create_entry(data, user_id):
    required = ['doctor_id', 'hospital_id', 'patient_name', 'amount']
    for field in required:
        if field not in data or data[field] is None or data[field] == '':
            raise ValueError(f"Missing required field: {field}")

    try:
        doctor_id = int(data['doctor_id'])
        hospital_id = int(data['hospital_id'])
        amount = float(data['amount'])
        no_of_units = int(data.get('no_of_units', 1) or 1)
        paid_amount = float(data.get('paid_amount', 0) or 0)
        rate_per_unit = float(data.get('rate_per_unit', 0) or 0)
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid data type: {str(e)}")

    if not (isinstance(amount, (int, float)) and amount > 0):
        raise ValueError("Amount must be a positive number")

    if paid_amount < 0:
        raise ValueError("Paid amount cannot be negative")
    if paid_amount > amount:
        raise ValueError("Paid amount cannot exceed the total amount")

    entry_type = data.get('entry_type', 'date') or 'date'
    if entry_type not in ('date', 'month'):
        entry_type = 'date'

    entry_month = data.get('entry_month')
    if entry_type == 'month':
        if not entry_month or len(str(entry_month)) != 7:
            raise ValueError("entry_month must be in 'YYYY-MM' format when entry_type='month'")
        entry_month = str(entry_month)
    else:
        entry_month = None

    balance_amount = amount - paid_amount

    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        raise ValueError(f"Doctor with ID {doctor_id} not found")
    hospital = Hospital.query.get(hospital_id)
    if not hospital:
        raise ValueError(f"Hospital with ID {hospital_id} not found")
    if hospital not in doctor.hospitals:
        raise ValueError(
            f"Hospital '{hospital.hospital_name}' is not linked to doctor '{doctor.doctor_name}'"
        )

    attempts = 3
    while attempts > 0:
        try:
            entry_no = generate_entry_no()
            entry = DentalEntry(
                entry_no=entry_no,
                entry_date=data.get('entry_date', datetime.utcnow().date()),
                entry_type=entry_type,
                entry_month=entry_month,
                doctor_id=doctor_id,
                hospital_id=hospital_id,
                patient_name=data['patient_name'].strip(),
                description=data.get('description', ''),
                no_of_units=no_of_units,
                rate_per_unit=rate_per_unit,
                shade_type=data.get('shade_type'),
                work_type=data.get('work_type'),
                amount=amount,
                paid_amount=paid_amount,
                balance_amount=balance_amount,
                created_by=user_id,
            )
            db.session.add(entry)
            db.session.commit()
            return entry
        except IntegrityError as ie:
            db.session.rollback()
            if 'Duplicate entry' in str(ie.orig) and 'entry_no' in str(ie.orig):
                attempts -= 1
                continue
            else:
                raise ValueError(f"Database integrity error: {str(ie.orig)}")
    raise ValueError("Failed to generate a unique entry number after multiple attempts")
def get_entries(filters=None):
    query = DentalEntry.query
    if filters:
        if 'doctor_id' in filters:
            query = query.filter_by(doctor_id=filters['doctor_id'])
        if 'hospital_id' in filters:
            query = query.filter_by(hospital_id=filters['hospital_id'])

        if 'entry_type' in filters and filters['entry_type'] in ('date', 'month'):
            query = query.filter(DentalEntry.entry_type == filters['entry_type'])

        if 'month' in filters:
            ym = str(filters['month'])
            year_s, mon_s = ym.split('-')
            year_i, mon_i = int(year_s), int(mon_s)
            first_day = date(year_i, mon_i, 1)
            last_day = date(year_i, mon_i, calendar.monthrange(year_i, mon_i)[1])
            query = query.filter(
                or_(
                    DentalEntry.entry_month == ym,
                    and_(
                        func.date(DentalEntry.entry_date) >= first_day,
                        func.date(DentalEntry.entry_date) <= last_day,
                    )
                )
            )

        if 'date_from' in filters:
            query = query.filter(func.date(DentalEntry.entry_date) >= filters['date_from'])
        if 'date_to' in filters:
            query = query.filter(func.date(DentalEntry.entry_date) <= filters['date_to'])

        if 'patient_name' in filters:
            query = query.filter(DentalEntry.patient_name.like(f"%{filters['patient_name']}%"))
        if 'work_type' in filters:
            query = query.filter_by(work_type=filters['work_type'])

        # Free-text search: patient_name, entry_no, doctor_name (via join)
        if 'search' in filters and filters['search']:
            term = f"%{filters['search']}%"
            query = query.join(Doctor, DentalEntry.doctor_id == Doctor.id, isouter=True).filter(
                or_(
                    DentalEntry.patient_name.like(term),
                    DentalEntry.entry_no.like(term),
                    Doctor.doctor_name.like(term),
                )
            )

    return query.order_by(DentalEntry.entry_date.desc(), DentalEntry.id.desc())

def get_entry(entry_id):
    return DentalEntry.query.get(entry_id)


def update_entry(entry_id, data):
    entry = DentalEntry.query.get_or_404(entry_id)

    new_amount = float(data['amount']) if data.get('amount') is not None else float(entry.amount)
    new_paid = (
        float(data['paid_amount'])
        if data.get('paid_amount') is not None
        else float(entry.paid_amount or 0)
    )

    if new_paid < 0:
        raise ValueError("Paid amount cannot be negative")
    if new_paid > new_amount:
        raise ValueError("Paid amount cannot exceed the total amount")

    if 'entry_type' in data and data['entry_type'] is not None:
        et = data['entry_type']
        entry.entry_type = et if et in ('date', 'month') else 'date'

    if 'entry_month' in data:
        em = data['entry_month']
        if entry.entry_type == 'month':
            if not em or len(str(em)) != 7:
                raise ValueError("entry_month must be in 'YYYY-MM' format")
            entry.entry_month = str(em)
        else:
            entry.entry_month = None

    skip_fields = ('paid_amount', 'balance_amount', 'amount', 'entry_type', 'entry_month')
    for key, value in data.items():
        if key in skip_fields:
            continue
        if hasattr(entry, key) and value is not None:
            setattr(entry, key, value)

    entry.amount = new_amount
    entry.paid_amount = new_paid
    entry.balance_amount = new_amount - new_paid

    db.session.commit()
    return entry


def delete_entry(entry_id):
    entry = DentalEntry.query.get_or_404(entry_id)
    db.session.delete(entry)
    db.session.commit()


# ============================================================
#  apply_payment  →  REQUIRED by routes/entries.py
#  Adds `amount` to paid_amount of one entry, recomputes balance.
# ============================================================
def apply_payment(entry_id, amount):
    if amount is None:
        raise ValueError("Payment amount is required")

    try:
        amount_f = float(amount)
    except (ValueError, TypeError):
        raise ValueError("Payment amount must be a number")

    if amount_f <= 0:
        raise ValueError("Payment amount must be greater than 0")

    entry = DentalEntry.query.get(entry_id)
    if not entry:
        raise ValueError("Entry not found")

    current_amount = float(entry.amount or 0)
    current_paid = float(entry.paid_amount or 0)
    current_balance = round(current_amount - current_paid, 2)

    if current_balance <= 0:
        raise ValueError("No outstanding balance for this entry")

    if amount_f > current_balance:
        raise ValueError(
            f"Payment amount cannot be greater than the remaining balance "
            f"(₹{current_balance:.2f})"
        )

    new_paid = round(current_paid + amount_f, 2)
    entry.paid_amount = new_paid
    entry.balance_amount = round(current_amount - new_paid, 2)

    db.session.commit()
    return entry
def get_entries_paginated(filters=None, page=1, per_page=25):
    """
    Returns a Flask-SQLAlchemy Pagination object using the same filters
    as get_entries(). Ensures stable ordering by entry_date DESC, id DESC.
    """
    query = get_entries(filters)
    page = max(int(page or 1), 1)
    per_page = int(per_page or 25)
    if per_page not in (10, 25, 50, 100):
        per_page = 25
    return query.paginate(page=page, per_page=per_page, error_out=False)