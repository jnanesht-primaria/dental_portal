from flask import Blueprint, request, jsonify
from services.entry_service import (
    create_entry, get_entries, get_entry, update_entry, delete_entry,
    apply_payment, get_entries_paginated,
)
from utils.jwt_utils import token_required
from datetime import datetime
import logging
import os

# --- Setup logging ---
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, 'entry_errors.log')

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.ERROR,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

entry_bp = Blueprint('entries', __name__, url_prefix='/api/entries')


def _parse_entry_date(data):
    if 'entry_date' in data and isinstance(data['entry_date'], str):
        try:
            data['entry_date'] = datetime.strptime(data['entry_date'], '%Y-%m-%d').date()
        except ValueError:
            raise ValueError('Invalid date format, use YYYY-MM-DD')


def _recompute_amounts(data):
    entry_type = data.get('entry_type', 'date')
    if entry_type not in ('date', 'month'):
        entry_type = 'date'
        data['entry_type'] = entry_type

    if entry_type == 'date':
        units = data.get('no_of_units')
        rate = data.get('rate_per_unit')
        if units is not None and rate is not None:
            try:
                units_i = int(units) if units != '' else 1
                rate_f = float(rate) if rate != '' else 0
                data['no_of_units'] = units_i
                data['rate_per_unit'] = round(rate_f, 2)
                data['amount'] = round(units_i * rate_f, 2)
            except (ValueError, TypeError):
                raise ValueError('Invalid no_of_units or rate_per_unit')

    try:
        amount = float(data.get('amount') or 0)
        paid = float(data.get('paid_amount') or 0)
        data['amount'] = round(amount, 2)
        data['paid_amount'] = round(paid, 2)
        data['balance_amount'] = round(amount - paid, 2)
    except (ValueError, TypeError):
        raise ValueError('Invalid amount or paid_amount')


def _entry_to_dict(entry):
    doctor_name = ''
    if entry.doctor:
        doctor_name = getattr(entry.doctor, 'doctor_name', None) or \
                      getattr(entry.doctor, 'name', None) or \
                      getattr(entry.doctor, 'full_name', '')
    hospital_name = ''
    if entry.hospital:
        hospital_name = getattr(entry.hospital, 'hospital_name', None) or \
                        getattr(entry.hospital, 'name', None) or ''

    amount = float(entry.amount or 0)
    paid = float(entry.paid_amount or 0)
    rate = float(entry.rate_per_unit or 0)
    balance = amount - paid

    return {
        'id': entry.id,
        'entry_no': entry.entry_no,
        'entry_date': entry.entry_date.isoformat() if entry.entry_date else '',
        'entry_type': getattr(entry, 'entry_type', 'date') or 'date',
        'entry_month': getattr(entry, 'entry_month', None),
        'doctor_id': entry.doctor_id,
        'doctor_name': doctor_name,
        'hospital_id': entry.hospital_id,
        'hospital_name': hospital_name,
        'patient_name': entry.patient_name,
        'description': entry.description,
        'no_of_units': entry.no_of_units,
        'rate_per_unit': rate,
        'shade_type': entry.shade_type,
        'work_type': entry.work_type,
        'amount': amount,
        'paid_amount': paid,
        'balance_amount': balance,
    }


@entry_bp.route('', methods=['POST'])
@token_required
def add_entry():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        entry_type = data.get('entry_type', 'date')
        if entry_type not in ('date', 'month'):
            entry_type = 'date'
        data['entry_type'] = entry_type

        if entry_type == 'month':
            em = data.get('entry_month')
            if not em or len(em) != 7:
                return jsonify({'error': "entry_month must be 'YYYY-MM'"}), 400
        else:
            data.pop('entry_month', None)

        _parse_entry_date(data)
        _recompute_amounts(data)

        user_id = request.user['sub']
        entry = create_entry(data, user_id)
        return jsonify({'message': 'Entry added', 'id': entry.id}), 201

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        import traceback
        logging.error(traceback.format_exc())
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


# ============================================================
#  GET /api/entries
#
#  Supports two modes for backwards compatibility:
#    - default: returns a plain array (used by Revenue etc.)
#    - ?paginate=1: returns { items, pagination }
#
#  Filters: doctor_id, hospital_id, month, date_from, date_to,
#           patient_name, work_type, entry_type, search
# ============================================================
@entry_bp.route('', methods=['GET'])
@token_required
def list_entries():
    try:
        filters = {}
        if 'doctor_id' in request.args and request.args['doctor_id']:
            filters['doctor_id'] = int(request.args['doctor_id'])
        if 'hospital_id' in request.args and request.args['hospital_id']:
            filters['hospital_id'] = int(request.args['hospital_id'])

        if 'month' in request.args and request.args['month']:
            filters['month'] = request.args['month']

        if 'date_from' in request.args and request.args['date_from']:
            filters['date_from'] = datetime.strptime(request.args['date_from'], '%Y-%m-%d').date()
        if 'date_to' in request.args and request.args['date_to']:
            filters['date_to'] = datetime.strptime(request.args['date_to'], '%Y-%m-%d').date()

        if 'patient_name' in request.args and request.args['patient_name']:
            filters['patient_name'] = request.args['patient_name']
        if 'work_type' in request.args and request.args['work_type']:
            filters['work_type'] = request.args['work_type']

        if 'entry_type' in request.args and request.args['entry_type'] in ('date', 'month'):
            filters['entry_type'] = request.args['entry_type']

        # Free-text search across patient name / doctor name / entry_no
        if 'search' in request.args and request.args['search']:
            filters['search'] = request.args['search'].strip()

        # ---- Paginated mode ----
        paginate = request.args.get('paginate')
        if paginate in ('1', 'true', 'True'):
            page = request.args.get('page', type=int) or 1
            per_page = request.args.get('per_page', type=int) or 25
            if per_page not in (10, 25, 50, 100):
                per_page = 25

            pagination = get_entries_paginated(filters, page=page, per_page=per_page)
            return jsonify({
                'items': [_entry_to_dict(e) for e in pagination.items],
                'pagination': {
                    'page': pagination.page,
                    'per_page': pagination.per_page,
                    'total': pagination.total,
                    'pages': pagination.pages,
                    'has_prev': pagination.has_prev,
                    'has_next': pagination.has_next,
                },
            }), 200

        # ---- Legacy mode: plain array (used by Revenue) ----
        query = get_entries(filters)
        limit = request.args.get('limit', type=int)
        if limit:
            query = query.limit(limit)
        entries = query.all()

        return jsonify([_entry_to_dict(e) for e in entries])

    except Exception as e:
        import traceback
        logging.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@entry_bp.route('/<int:entry_id>', methods=['GET'])
@token_required
def get_entry_by_id(entry_id):
    try:
        entry = get_entry(entry_id)
        if not entry:
            return jsonify({'error': 'Entry not found'}), 404
        return jsonify(_entry_to_dict(entry))
    except Exception as e:
        import traceback
        logging.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@entry_bp.route('/<int:entry_id>', methods=['PUT'])
@token_required
def update_entry_by_id(entry_id):
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No update data provided'}), 400

        if 'entry_type' in data and data['entry_type'] not in ('date', 'month'):
            data['entry_type'] = 'date'

        _parse_entry_date(data)
        _recompute_amounts(data)

        entry = update_entry(entry_id, data)
        return jsonify({'message': 'Entry updated'})
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        import traceback
        logging.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@entry_bp.route('/<int:entry_id>', methods=['DELETE'])
@token_required
def delete_entry_by_id(entry_id):
    try:
        delete_entry(entry_id)
        return jsonify({'message': 'Entry deleted'})
    except Exception as e:
        import traceback
        logging.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@entry_bp.route('/<int:entry_id>/pay', methods=['POST'])
@token_required
def pay_entry_balance(entry_id):
    try:
        data = request.get_json(silent=True) or {}
        amount = data.get('amount')

        if amount is None or amount == '':
            return jsonify({'error': 'Payment amount is required'}), 400
        try:
            amount_f = float(amount)
        except (ValueError, TypeError):
            return jsonify({'error': 'Payment amount must be a number'}), 400

        if amount_f <= 0:
            return jsonify({'error': 'Payment amount must be greater than 0'}), 400

        entry = apply_payment(entry_id, amount_f)

        return jsonify({
            'message': 'Payment applied',
            'id': entry.id,
            'amount': float(entry.amount or 0),
            'paid_amount': float(entry.paid_amount or 0),
            'balance_amount': float(entry.balance_amount or 0),
        }), 200

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        import traceback
        logging.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500