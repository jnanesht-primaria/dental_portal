# backend/services/dashboard_service.py
from models import db, Doctor, Hospital, DentalEntry
from datetime import datetime
from sqlalchemy import func, extract
from services.revenue_service import get_monthly_trend


def _safe_float(v):
    try:
        return float(v) if v is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


def get_dashboard_stats():
    """
    Always returns a fully-populated dict, even if individual
    queries fail or return no rows. This guarantees the frontend
    never receives a response missing a key.
    """
    today = datetime.utcnow().date()
    current_month = today.month
    current_year = today.year

    safe = {
        'total_doctors': 0,
        'total_hospitals': 0,
        'today_cases': 0,
        'monthly_cases': 0,
        'total_revenue': 0.0,
        'monthly_revenue': 0.0,
        'top_doctors': [],
        'top_hospitals': [],
        'work_type_distribution': [],
        'monthly_trend': [],
    }

    # ---- Simple counts / totals ----
    try:
        safe['total_doctors'] = Doctor.query.filter_by(status='Active').count()
    except Exception as e:
        print(f"[dashboard_service] total_doctors failed: {e}")

    try:
        safe['total_hospitals'] = Hospital.query.filter_by(status='Active').count()
    except Exception as e:
        print(f"[dashboard_service] total_hospitals failed: {e}")

    try:
        safe['today_cases'] = DentalEntry.query.filter(
            DentalEntry.entry_date == today
        ).count()
    except Exception as e:
        print(f"[dashboard_service] today_cases failed: {e}")

    try:
        safe['monthly_cases'] = DentalEntry.query.filter(
            extract('month', DentalEntry.entry_date) == current_month,
            extract('year',  DentalEntry.entry_date) == current_year,
        ).count()
    except Exception as e:
        print(f"[dashboard_service] monthly_cases failed: {e}")

    try:
        safe['total_revenue'] = _safe_float(
            db.session.query(func.sum(DentalEntry.amount)).scalar()
        )
    except Exception as e:
        print(f"[dashboard_service] total_revenue failed: {e}")

    try:
        safe['monthly_revenue'] = _safe_float(
            db.session.query(func.sum(DentalEntry.amount)).filter(
                extract('month', DentalEntry.entry_date) == current_month,
                extract('year',  DentalEntry.entry_date) == current_year,
            ).scalar()
        )
    except Exception as e:
        print(f"[dashboard_service] monthly_revenue failed: {e}")

    # ---- Top 5 doctors ----
    try:
        top_doctors = (
            db.session.query(
                Doctor.doctor_name,
                func.sum(DentalEntry.amount).label('revenue'),
            )
            .join(DentalEntry)
            .filter(
                extract('month', DentalEntry.entry_date) == current_month,
                extract('year',  DentalEntry.entry_date) == current_year,
            )
            .group_by(Doctor.id)
            .order_by(func.sum(DentalEntry.amount).desc())
            .limit(5)
            .all()
        )
        safe['top_doctors'] = [
            {'name': d.doctor_name or 'Unknown', 'revenue': _safe_float(d.revenue)}
            for d in top_doctors
        ]
    except Exception as e:
        print(f"[dashboard_service] top_doctors failed: {e}")

    # ---- Top 5 hospitals ----
    try:
        top_hospitals = (
            db.session.query(
                Hospital.hospital_name,
                func.sum(DentalEntry.amount).label('revenue'),
            )
            .join(DentalEntry)
            .filter(
                extract('month', DentalEntry.entry_date) == current_month,
                extract('year',  DentalEntry.entry_date) == current_year,
            )
            .group_by(Hospital.id)
            .order_by(func.sum(DentalEntry.amount).desc())
            .limit(5)
            .all()
        )
        safe['top_hospitals'] = [
            {'name': h.hospital_name or 'Unknown', 'revenue': _safe_float(h.revenue)}
            for h in top_hospitals
        ]
    except Exception as e:
        print(f"[dashboard_service] top_hospitals failed: {e}")

    # ---- Work type distribution ----
    try:
        work_dist = (
            db.session.query(
                DentalEntry.work_type,
                func.count(DentalEntry.id).label('count'),
            )
            .filter(
                extract('month', DentalEntry.entry_date) == current_month,
                extract('year',  DentalEntry.entry_date) == current_year,
            )
            .group_by(DentalEntry.work_type)
            .all()
        )
        safe['work_type_distribution'] = [
            {'work_type': w.work_type or 'Unknown', 'count': int(w.count or 0)}
            for w in work_dist
        ]
    except Exception as e:
        print(f"[dashboard_service] work_type_distribution failed: {e}")

    # ---- Monthly trend (last 12 months) ----
    try:
        monthly_trend = get_monthly_trend(current_year)
        if isinstance(monthly_trend, dict):
            safe['monthly_trend'] = [
                {'month': m, 'revenue': _safe_float(v)}
                for m, v in monthly_trend.items()
            ]
        elif isinstance(monthly_trend, list):
            # Already a list of {month, revenue} — normalise floats.
            safe['monthly_trend'] = [
                {
                    'month': item.get('month') if isinstance(item, dict) else None,
                    'revenue': _safe_float(item.get('revenue') if isinstance(item, dict) else 0),
                }
                for item in monthly_trend
            ]
    except Exception as e:
        print(f"[dashboard_service] monthly_trend failed: {e}")

    return safe