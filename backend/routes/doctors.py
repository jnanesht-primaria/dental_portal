from flask import Blueprint, request, jsonify
from services.doctor_service import create_doctor, get_all_doctors, get_doctor, update_doctor, delete_doctor
from utils.jwt_utils import token_required

doctor_bp = Blueprint('doctors', __name__, url_prefix='/api/doctors')

@doctor_bp.route('', methods=['POST'])
@token_required
def add_doctor():
    try:
        data = request.json
        # Validate required fields
        if not data.get('doctor_name') or not data.get('phone'):
            return jsonify({'error': 'Doctor name and phone are required'}), 400
        
        doctor = create_doctor(data)
        return jsonify({'message': 'Doctor added', 'id': doctor.id}), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@doctor_bp.route('', methods=['GET'])
@token_required
def list_doctors():
    try:
        active_only = request.args.get('active_only', 'false').lower() == 'true'
        doctors = get_all_doctors(active_only)
        result = [{
            'id': d.id,
            'doctor_name': d.doctor_name,
            'designation': d.designation,
            'phone': d.phone,
            'email': d.email,
            'address': d.address,
            'role': d.role,
            'status': d.status,
            'hospitals': [{'id': h.id, 'name': h.hospital_name} for h in d.hospitals]
        } for d in doctors]
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@doctor_bp.route('/<int:doctor_id>', methods=['GET'])
@token_required
def get_doctor_by_id(doctor_id):
    try:
        doctor = get_doctor(doctor_id)
        if not doctor:
            return jsonify({'error': 'Doctor not found'}), 404
        return jsonify({
            'id': doctor.id,
            'doctor_name': doctor.doctor_name,
            'designation': doctor.designation,
            'phone': doctor.phone,
            'email': doctor.email,
            'address': doctor.address,
            'role': doctor.role,
            'status': doctor.status,
            'hospitals': [{'id': h.id, 'name': h.hospital_name} for h in doctor.hospitals]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@doctor_bp.route('/<int:doctor_id>', methods=['PUT'])
@token_required
def update_doctor_by_id(doctor_id):
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No update data provided'}), 400
        doctor = update_doctor(doctor_id, data)
        return jsonify({'message': 'Doctor updated'})
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@doctor_bp.route('/<int:doctor_id>', methods=['DELETE'])
@token_required
def delete_doctor_by_id(doctor_id):
    try:
        delete_doctor(doctor_id)
        return jsonify({'message': 'Doctor deleted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500