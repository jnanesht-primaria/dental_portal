from models import db, Doctor, Hospital, DentalEntry
from datetime import datetime
from sqlalchemy import func, extract
from services.revenue_service import get_monthly_trend

def get_dashboard_stats():
    today = datetime.utcnow().date()
    current_month = today.month
    current_year = today.year

    total_doctors = Doctor.query.filter_by(status='Active').count()
    total_hospitals = Hospital.query.filter_by(status='Active').count()
    today_cases = DentalEntry.query.filter(DentalEntry.entry_date == today).count()
    monthly_cases = DentalEntry.query.filter(
        extract('month', DentalEntry.entry_date) == current_month,
        extract('year', DentalEntry.entry_date) == current_year
    ).count()
    total_revenue = db.session.query(func.sum(DentalEntry.amount)).scalar() or 0
    monthly_revenue = db.session.query(func.sum(DentalEntry.amount)).filter(
        extract('month', DentalEntry.entry_date) == current_month,
        extract('year', DentalEntry.entry_date) == current_year
    ).scalar() or 0

    # Top 5 doctors by revenue (current month)
    top_doctors = db.session.query(
        Doctor.doctor_name,
        func.sum(DentalEntry.amount).label('revenue')
    ).join(DentalEntry).filter(
        extract('month', DentalEntry.entry_date) == current_month,
        extract('year', DentalEntry.entry_date) == current_year
    ).group_by(Doctor.id).order_by(func.sum(DentalEntry.amount).desc()).limit(5).all()
    
    top_hospitals = db.session.query(
        Hospital.hospital_name,
        func.sum(DentalEntry.amount).label('revenue')
    ).join(DentalEntry).filter(
        extract('month', DentalEntry.entry_date) == current_month,
        extract('year', DentalEntry.entry_date) == current_year
    ).group_by(Hospital.id).order_by(func.sum(DentalEntry.amount).desc()).limit(5).all()

    # Work type distribution (current month)
    work_dist = db.session.query(
        DentalEntry.work_type,
        func.count(DentalEntry.id).label('count')
    ).filter(
        extract('month', DentalEntry.entry_date) == current_month,
        extract('year', DentalEntry.entry_date) == current_year
    ).group_by(DentalEntry.work_type).all()

    # Monthly trend for last 12 months
    monthly_trend = get_monthly_trend(current_year)
    # Convert to list of dicts for chart
    trend_data = [{'month': m, 'revenue': float(v)} for m, v in monthly_trend.items()]

    return {
        'total_doctors': total_doctors,
        'total_hospitals': total_hospitals,
        'today_cases': today_cases,
        'monthly_cases': monthly_cases,
        'total_revenue': float(total_revenue),
        'monthly_revenue': float(monthly_revenue),
        'top_doctors': [{'name': d.doctor_name, 'revenue': float(d.revenue)} for d in top_doctors],
        'top_hospitals': [{'name': h.hospital_name, 'revenue': float(h.revenue)} for h in top_hospitals],
        'work_type_distribution': [{'work_type': w.work_type, 'count': w.count} for w in work_dist],
        'monthly_trend': trend_data
    }