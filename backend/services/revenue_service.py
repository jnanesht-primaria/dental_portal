from models import db, DentalEntry, Doctor, Hospital
from sqlalchemy import func, extract

def get_doctor_revenue(doctor_id, month, year):
    """Return revenue summary for a doctor for a given month/year."""
    query = db.session.query(
        Hospital.hospital_name,
        func.sum(DentalEntry.amount).label('total_amount'),
        func.sum(DentalEntry.no_of_units).label('total_units'),
        func.count(DentalEntry.id).label('total_entries')
    ).join(Hospital).filter(
        DentalEntry.doctor_id == doctor_id,
        extract('month', DentalEntry.entry_date) == month,
        extract('year', DentalEntry.entry_date) == year
    ).group_by(Hospital.id)
    result = query.all()
    # Also compute grand total
    grand_total = db.session.query(func.sum(DentalEntry.amount)).filter(
        DentalEntry.doctor_id == doctor_id,
        extract('month', DentalEntry.entry_date) == month,
        extract('year', DentalEntry.entry_date) == year
    ).scalar() or 0
    return {
        'details': [{'hospital': r.hospital_name, 'amount': float(r.total_amount),
                     'units': int(r.total_units), 'entries': int(r.total_entries)} for r in result],
        'grand_total': float(grand_total)
    }

def get_hospital_revenue(hospital_id, month, year):
    """Return revenue summary for a hospital for a given month/year."""
    query = db.session.query(
        Doctor.doctor_name,
        func.sum(DentalEntry.amount).label('total_amount'),
        func.count(DentalEntry.id).label('total_entries')
    ).join(Doctor).filter(
        DentalEntry.hospital_id == hospital_id,
        extract('month', DentalEntry.entry_date) == month,
        extract('year', DentalEntry.entry_date) == year
    ).group_by(Doctor.id)
    result = query.all()
    grand_total = db.session.query(func.sum(DentalEntry.amount)).filter(
        DentalEntry.hospital_id == hospital_id,
        extract('month', DentalEntry.entry_date) == month,
        extract('year', DentalEntry.entry_date) == year
    ).scalar() or 0
    return {
        'details': [{'doctor': r.doctor_name, 'amount': float(r.total_amount),
                     'entries': int(r.total_entries)} for r in result],
        'grand_total': float(grand_total)
    }

def get_monthly_trend(year):
    """Monthly revenue trend for all doctors (for dashboard)."""
    results = db.session.query(
        extract('month', DentalEntry.entry_date).label('month'),
        func.sum(DentalEntry.amount).label('total')
    ).filter(extract('year', DentalEntry.entry_date) == year)\
     .group_by('month').order_by('month').all()
    return {int(r.month): float(r.total) for r in results}