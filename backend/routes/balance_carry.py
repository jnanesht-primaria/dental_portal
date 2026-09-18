from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db, BalanceCarry, Doctor, Hospital, DentalEntry
from utils.jwt_utils import token_required
from sqlalchemy import func


balance_carry_bp = Blueprint(
    'balance_carry', __name__, url_prefix='/api/balance_carry'
)


def _next_month(ym):
    """'2026-09' → '2026-10'; December → January."""
    try:
        y, m = map(int, str(ym).split('-'))
    except (ValueError, TypeError):
        return None
    m += 1
    if m > 12:
        m = 1
        y += 1
    return f"{y:04d}-{m:02d}"


def _find_row(doctor_id, hospital_id, month):
    q = BalanceCarry.query.filter_by(doctor_id=int(doctor_id), month=str(month))
    if hospital_id:
        q = q.filter_by(hospital_id=int(hospital_id))
    else:
        q = q.filter(BalanceCarry.hospital_id.is_(None))
    return q.first()


@balance_carry_bp.route('', methods=['GET'])
@token_required
def get_balance_carry():
    """GET /api/balance_carry?doctor_id=1&month=2026-09&hospital_id=2"""
    try:
        doctor_id = request.args.get('doctor_id', type=int)
        month = request.args.get('month', type=str)
        hospital_id = request.args.get('hospital_id', type=int)

        if not doctor_id or not month:
            return jsonify({'error': 'doctor_id and month are required'}), 400

        row = _find_row(doctor_id, hospital_id, month)
        return jsonify({
            'doctor_id': doctor_id,
            'hospital_id': hospital_id or None,
            'month': month,
            'previous_balance': float(row.previous_balance) if row else 0.0,
            'paid_amount': float(row.paid_amount) if row else 0.0,
            'is_manual_override': bool(row.is_manual_override) if row else False,
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@balance_carry_bp.route('', methods=['POST'])
@token_required
def upsert_balance_carry():
    """
    POST /api/balance_carry
    Body: { doctor_id, month, hospital_id?, previous_balance?, paid_amount? }

    Saves whichever of previous_balance / paid_amount is provided.
    Marks row as manual if previous_balance was sent.
    """
    try:
        data = request.get_json(silent=True) or {}

        doctor_id = data.get('doctor_id')
        month = data.get('month')
        hospital_id = data.get('hospital_id')

        if not doctor_id or not month:
            return jsonify({'error': 'doctor_id and month are required'}), 400
        if len(str(month)) != 7:
            return jsonify({'error': "month must be 'YYYY-MM'"}), 400

        # Validate doctor
        doctor = Doctor.query.get(int(doctor_id))
        if not doctor:
            return jsonify({'error': 'Doctor not found'}), 404
        if hospital_id:
            hospital = Hospital.query.get(int(hospital_id))
            if not hospital:
                return jsonify({'error': 'Hospital not found'}), 404

        # Parse optional values
        prev_f = None
        if 'previous_balance' in data:
            try:
                prev_f = float(data.get('previous_balance') or 0)
            except (ValueError, TypeError):
                return jsonify({'error': 'previous_balance must be a number'}), 400
            if prev_f < 0:
                return jsonify({'error': 'previous_balance cannot be negative'}), 400

        paid_f = None
        if 'paid_amount' in data:
            try:
                paid_f = float(data.get('paid_amount') or 0)
            except (ValueError, TypeError):
                return jsonify({'error': 'paid_amount must be a number'}), 400
            if paid_f < 0:
                return jsonify({'error': 'paid_amount cannot be negative'}), 400

        # Find or create
        row = _find_row(doctor_id, hospital_id, month)
        if row:
            if prev_f is not None:
                row.previous_balance = prev_f
                row.is_manual_override = True
            if paid_f is not None:
                row.paid_amount = paid_f
            row.updated_at = datetime.utcnow()
        else:
            row = BalanceCarry(
                doctor_id=int(doctor_id),
                hospital_id=int(hospital_id) if hospital_id else None,
                month=str(month),
                previous_balance=prev_f if prev_f is not None else 0,
                paid_amount=paid_f if paid_f is not None else 0,
                is_manual_override=(prev_f is not None),
            )
            db.session.add(row)

        db.session.commit()

        return jsonify({
            'message': 'Balance carry saved',
            'id': row.id,
            'doctor_id': row.doctor_id,
            'hospital_id': row.hospital_id,
            'month': row.month,
            'previous_balance': float(row.previous_balance),
            'paid_amount': float(row.paid_amount),
            'is_manual_override': bool(row.is_manual_override),
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@balance_carry_bp.route('/auto', methods=['POST'])
@token_required
def auto_carry_forward():
    """
    POST /api/balance_carry/auto
    Body: { doctor_id, hospital_id?, month, previous_balance?, paid_amount? }

    Called after Filter. Computes:

      total_amount = Σ entry.amount                (DATE-only, this month)
      total_due    = total_amount + previous_balance
      remaining    = total_due − paid_amount       (never < 0)
      → stores `remaining` as NEXT month's previous_balance
        unless next month is manual override

    Also persists this month's previous_balance / paid_amount if sent.
    """
    try:
        data = request.get_json(silent=True) or {}
        doctor_id = data.get('doctor_id')
        month = data.get('month')
        hospital_id = data.get('hospital_id')

        if not doctor_id or not month:
            return jsonify({'error': 'doctor_id and month are required'}), 400
        if len(str(month)) != 7:
            return jsonify({"error": "month must be 'YYYY-MM'"}), 400

        # Parse optional inputs (values the user has just typed)
        manual_prev = data.get('previous_balance', None)
        manual_paid = data.get('paid_amount', None)

        prev_f = None
        if manual_prev is not None:
            try:
                prev_f = float(manual_prev or 0)
            except (ValueError, TypeError):
                prev_f = 0.0
            if prev_f < 0:
                prev_f = 0.0

        paid_f = None
        if manual_paid is not None:
            try:
                paid_f = float(manual_paid or 0)
            except (ValueError, TypeError):
                paid_f = 0.0
            if paid_f < 0:
                paid_f = 0.0

        # ---- 1) Compute this month's Total Amount ----
        q = DentalEntry.query.filter(
            DentalEntry.doctor_id == int(doctor_id),
            DentalEntry.entry_type == 'date',
        )
        if hospital_id:
            q = q.filter(DentalEntry.hospital_id == int(hospital_id))

        q = q.filter(func.date_format(DentalEntry.entry_date, '%Y-%m') == str(month))
        rows = q.all()
        total = sum(float(r.amount or 0) for r in rows)

        # ---- 2) Load current DB row (if exists) ----
        current_row = _find_row(doctor_id, hospital_id, month)

        # ---- 3) Decide current month's values ----
        # Priority: manual input > DB value > 0
        if prev_f is None:
            prev_f = float(current_row.previous_balance) if current_row else 0.0
        if paid_f is None:
            paid_f = float(current_row.paid_amount) if current_row else 0.0

        # ---- 4) Persist this month's values ----
        if current_row:
            current_row.previous_balance = prev_f
            current_row.paid_amount = paid_f
            if manual_prev is not None:
                current_row.is_manual_override = True
            current_row.updated_at = datetime.utcnow()
        else:
            current_row = BalanceCarry(
                doctor_id=int(doctor_id),
                hospital_id=int(hospital_id) if hospital_id else None,
                month=str(month),
                previous_balance=prev_f,
                paid_amount=paid_f,
                is_manual_override=(manual_prev is not None),
            )
            db.session.add(current_row)

        db.session.commit()

        # ---- 5) Compute Remaining ----
        total_due = round(total + prev_f, 2)
        remaining = round(total_due - paid_f, 2)
        if remaining < 0:
            remaining = 0.0

        # ---- 6) Write to NEXT month (unless next month is manual) ----
        next_m = _next_month(month)
        skipped_next = False
        next_carried = None

        if next_m:
            next_row = _find_row(doctor_id, hospital_id, next_m)
            if next_row and next_row.is_manual_override:
                skipped_next = True
            elif next_row:
                next_row.previous_balance = remaining
                next_row.updated_at = datetime.utcnow()
                db.session.commit()
                next_carried = remaining
            else:
                next_row = BalanceCarry(
                    doctor_id=int(doctor_id),
                    hospital_id=int(hospital_id) if hospital_id else None,
                    month=next_m,
                    previous_balance=remaining,
                    paid_amount=0,
                    is_manual_override=False,
                )
                db.session.add(next_row)
                db.session.commit()
                next_carried = remaining

        return jsonify({
            'month': month,
            'total_amount': round(total, 2),
            'previous_balance': round(prev_f, 2),
            'paid_amount': round(paid_f, 2),
            'total_due': total_due,
            'remaining': remaining,
            'next_month': next_m,
            'next_month_previous_balance': next_carried,
            'next_month_skipped_manual': skipped_next,
            'current_month_is_manual_override': bool(current_row.is_manual_override),
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500