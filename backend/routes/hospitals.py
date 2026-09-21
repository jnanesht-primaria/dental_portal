from flask import Blueprint, request, jsonify
from services.hospital_service import create_hospital, get_all_hospitals, get_hospital, update_hospital
from utils.jwt_utils import token_required

hospital_bp = Blueprint('hospitals', __name__, url_prefix='/api/hospitals')

@hospital_bp.route('', methods=['POST'])
@token_required
def add_hospital():
    try:
        data = request.json
        # Validate required fields
        if not data.get('hospital_name'):
            return jsonify({'error': 'Hospital name is required'}), 400
        
        hospital = create_hospital(data)
        return jsonify({'message': 'Hospital added', 'id': hospital.id}), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@hospital_bp.route('', methods=['GET'])
@token_required
def list_hospitals():
    try:
        active_only = request.args.get('active_only', 'false').lower() == 'true'
        hospitals = get_all_hospitals(active_only)
        result = [{
            'id': h.id,
            'hospital_name': h.hospital_name,
            'contact_person': h.contact_person,
            'phone': h.phone,
            'address': h.address,
            'status': h.status
        } for h in hospitals]
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hospital_bp.route('/<int:hospital_id>', methods=['GET'])
@token_required
def get_hospital_by_id(hospital_id):
    try:
        hospital = get_hospital(hospital_id)
        if not hospital:
            return jsonify({'error': 'Hospital not found'}), 404
        return jsonify({
            'id': hospital.id,
            'hospital_name': hospital.hospital_name,
            'contact_person': hospital.contact_person,
            'phone': hospital.phone,
            'address': hospital.address,
            'status': hospital.status
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hospital_bp.route('/<int:hospital_id>', methods=['PUT'])
@token_required
def update_hospital_by_id(hospital_id):
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No update data provided'}), 400
        hospital = update_hospital(hospital_id, data)
        return jsonify({'message': 'Hospital updated'})
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500