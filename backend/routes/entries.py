from flask import Blueprint, request, jsonify
from services.entry_service import create_entry, get_entries, get_entry, update_entry, delete_entry
from utils.jwt_utils import token_required
from datetime import datetime
import logging
import os

# --- Setup logging to a file (so we can see errors when running as a service) ---
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, 'entry_errors.log')

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.ERROR,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

entry_bp = Blueprint('entries', __name__, url_prefix='/api/entries')

@entry_bp.route('', methods=['POST'])
@token_required
def add_entry():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        if 'entry_date' in data and isinstance(data['entry_date'], str):
            try:
                data['entry_date'] = datetime.strptime(data['entry_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid date format, use YYYY-MM-DD'}), 400

        user_id = request.user['sub']
        entry = create_entry(data, user_id)
        return jsonify({'message': 'Entry added', 'id': entry.id}), 201

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        logging.error(error_msg)
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@entry_bp.route('', methods=['GET'])
@token_required
def list_entries():
    try:
        filters = {}
        if 'doctor_id' in request.args:
            filters['doctor_id'] = int(request.args['doctor_id'])
        if 'hospital_id' in request.args:
            filters['hospital_id'] = int(request.args['hospital_id'])
        if 'date_from' in request.args:
            filters['date_from'] = datetime.strptime(request.args['date_from'], '%Y-%m-%d').date()
        if 'date_to' in request.args:
            filters['date_to'] = datetime.strptime(request.args['date_to'], '%Y-%m-%d').date()
        if 'patient_name' in request.args:
            filters['patient_name'] = request.args['patient_name']
        if 'work_type' in request.args:
            filters['work_type'] = request.args['work_type']

        query = get_entries(filters)
        limit = request.args.get('limit', type=int)
        if limit:
            query = query.limit(limit)
        entries = query.all()

        result = []
        for entry in entries:
            # Safely get doctor name – try common attribute names
            doctor_name = ''
            if entry.doctor:
                doctor_name = getattr(entry.doctor, 'doctor_name', None) or \
                              getattr(entry.doctor, 'name', None) or \
                              getattr(entry.doctor, 'full_name', '')
            # Similarly for hospital
            hospital_name = ''
            if entry.hospital:
                hospital_name = getattr(entry.hospital, 'hospital_name', None) or \
                                getattr(entry.hospital, 'name', None) or ''

            # Compute balance safely
            amount = float(entry.amount or 0)
            paid = float(entry.paid_amount or 0)
            balance = amount - paid

            result.append({
                'id': entry.id,
                'entry_no': entry.entry_no,
                'entry_date': entry.entry_date.isoformat(),
                'doctor_id': entry.doctor_id,
                'doctor_name': doctor_name,
                'hospital_id': entry.hospital_id,
                'hospital_name': hospital_name,
                'patient_name': entry.patient_name,
                'description': entry.description,
                'no_of_units': entry.no_of_units,
                'shade_type': entry.shade_type,
                'work_type': entry.work_type,
                'amount': amount,
                'paid_amount': paid,
                'balance_amount': balance
            })

        return jsonify(result)

    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        logging.error(error_msg)
        return jsonify({'error': str(e)}), 500

@entry_bp.route('/<int:entry_id>', methods=['GET'])
@token_required
def get_entry_by_id(entry_id):
    try:
        entry = get_entry(entry_id)
        if not entry:
            return jsonify({'error': 'Entry not found'}), 404

        doctor_name = ''
        if entry.doctor:
            doctor_name = getattr(entry.doctor, 'doctor_name', None) or \
                          getattr(entry.doctor, 'name', None) or ''
        hospital_name = ''
        if entry.hospital:
            hospital_name = getattr(entry.hospital, 'hospital_name', None) or \
                            getattr(entry.hospital, 'name', None) or ''

        return jsonify({
            'id': entry.id,
            'entry_no': entry.entry_no,
            'entry_date': entry.entry_date.isoformat(),
            'doctor_id': entry.doctor_id,
            'doctor_name': doctor_name,
            'hospital_id': entry.hospital_id,
            'hospital_name': hospital_name,
            'patient_name': entry.patient_name,
            'description': entry.description,
            'no_of_units': entry.no_of_units,
            'shade_type': entry.shade_type,
            'work_type': entry.work_type,
            'amount': float(entry.amount or 0)
        })
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        logging.error(error_msg)
        return jsonify({'error': str(e)}), 500

@entry_bp.route('/<int:entry_id>', methods=['PUT'])
@token_required
def update_entry_by_id(entry_id):
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No update data provided'}), 400

        if 'entry_date' in data and isinstance(data['entry_date'], str):
            try:
                data['entry_date'] = datetime.strptime(data['entry_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid date format, use YYYY-MM-DD'}), 400

        entry = update_entry(entry_id, data)
        return jsonify({'message': 'Entry updated'})
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        logging.error(error_msg)
        return jsonify({'error': str(e)}), 500

@entry_bp.route('/<int:entry_id>', methods=['DELETE'])
@token_required
def delete_entry_by_id(entry_id):
    try:
        delete_entry(entry_id)
        return jsonify({'message': 'Entry deleted'})
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        logging.error(error_msg)
        return jsonify({'error': str(e)}), 500