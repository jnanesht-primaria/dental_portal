from flask import Blueprint, request, jsonify
from services.entry_service import create_entry, get_entries, get_entry, update_entry, delete_entry
from utils.jwt_utils import token_required
from datetime import datetime

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
        traceback.print_exc()
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

# ---------- GET: List entries with optional filters and limit ----------
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

        print("📥 Received filters:", filters)

        query = get_entries(filters)
        print("🔍 SQL:", query)   # now inside try block

        limit = request.args.get('limit', type=int)
        if limit:
            query = query.limit(limit)
        entries = query.all()

        result = [{
            'id': e.id,
            'entry_no': e.entry_no,
            'entry_date': e.entry_date.isoformat(),
            'doctor_id': e.doctor_id,
            'doctor_name': e.doctor.doctor_name,
            'hospital_id': e.hospital_id,
            'hospital_name': e.hospital.hospital_name,
            'patient_name': e.patient_name,
            'description': e.description,
            'no_of_units': e.no_of_units,
            'shade_type': e.shade_type,
            'work_type': e.work_type,
            'amount': float(e.amount),
            'created_at': e.created_at.isoformat() if e.created_at else None
        } for e in entries]

        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ---------- GET: Single entry ----------
@entry_bp.route('/<int:entry_id>', methods=['GET'])
@token_required
def get_entry_by_id(entry_id):
    try:
        entry = get_entry(entry_id)
        if not entry:
            return jsonify({'error': 'Entry not found'}), 404
        return jsonify({
            'id': entry.id,
            'entry_no': entry.entry_no,
            'entry_date': entry.entry_date.isoformat(),
            'doctor_id': entry.doctor_id,
            'hospital_id': entry.hospital_id,
            'patient_name': entry.patient_name,
            'description': entry.description,
            'no_of_units': entry.no_of_units,
            'shade_type': entry.shade_type,
            'work_type': entry.work_type,
            'amount': float(entry.amount)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- PUT: Update entry ----------
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
        return jsonify({'error': str(e)}), 500

# ---------- DELETE: Delete entry ----------
@entry_bp.route('/<int:entry_id>', methods=['DELETE'])
@token_required
def delete_entry_by_id(entry_id):
    try:
        delete_entry(entry_id)
        return jsonify({'message': 'Entry deleted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500