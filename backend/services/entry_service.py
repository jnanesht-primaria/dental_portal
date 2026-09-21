from models import db, DentalEntry, Doctor, Hospital
from datetime import datetime
from sqlalchemy import func
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
        no_of_units = int(data.get('no_of_units', 1))
        paid_amount = float(data.get('paid_amount', 0) or 0)
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid data type: {str(e)}")

    if not (isinstance(amount, (int, float)) and amount > 0):
        raise ValueError("Amount must be a positive number")

    if paid_amount < 0:
        raise ValueError("Paid amount cannot be negative")
    if paid_amount > amount:
        raise ValueError("Paid amount cannot exceed the total amount")

    balance_amount = amount - paid_amount

    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        raise ValueError(f"Doctor with ID {doctor_id} not found")
    hospital = Hospital.query.get(hospital_id)
    if not hospital:
        raise ValueError(f"Hospital with ID {hospital_id} not found")
    if hospital not in doctor.hospitals:
        raise ValueError(f"Hospital '{hospital.hospital_name}' is not linked to doctor '{doctor.doctor_name}'")

    attempts = 3
    while attempts > 0:
        try:
            entry_no = generate_entry_no()
            entry = DentalEntry(
                entry_no=entry_no,
                entry_date=data.get('entry_date', datetime.utcnow().date()),
                doctor_id=doctor_id,
                hospital_id=hospital_id,
                patient_name=data['patient_name'].strip(),
                description=data.get('description', ''),
                no_of_units=no_of_units,
                shade_type=data.get('shade_type'),
                work_type=data.get('work_type'),
                amount=amount,
                paid_amount=paid_amount,
                balance_amount=balance_amount,
                created_by=user_id
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
        if 'date_from' in filters:
            query = query.filter(func.date(DentalEntry.entry_date) >= filters['date_from'])
        if 'date_to' in filters:
            query = query.filter(func.date(DentalEntry.entry_date) <= filters['date_to'])
        if 'patient_name' in filters:
            query = query.filter(DentalEntry.patient_name.like(f"%{filters['patient_name']}%"))
        if 'work_type' in filters:
            query = query.filter_by(work_type=filters['work_type'])
    return query.order_by(DentalEntry.entry_date.desc())

def get_entry(entry_id):
    return DentalEntry.query.get(entry_id)

def update_entry(entry_id, data):
    entry = DentalEntry.query.get_or_404(entry_id)

    new_amount = float(data['amount']) if data.get('amount') is not None else float(entry.amount)
    new_paid = float(data['paid_amount']) if data.get('paid_amount') is not None else float(entry.paid_amount or 0)

    if new_paid < 0:
        raise ValueError("Paid amount cannot be negative")
    if new_paid > new_amount:
        raise ValueError("Paid amount cannot exceed the total amount")

    for key, value in data.items():
        if key in ('paid_amount', 'balance_amount', 'amount'):
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