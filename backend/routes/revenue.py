from flask import Blueprint, request, jsonify
from services.revenue_service import get_doctor_revenue, get_hospital_revenue
from utils.jwt_utils import token_required

revenue_bp = Blueprint('revenue', __name__, url_prefix='/api/revenue')

@revenue_bp.route('/doctor/<int:doctor_id>', methods=['GET'])
@token_required
def doctor_revenue(doctor_id):
    month = request.args.get('month', type=int)
    year = request.args.get('year', type=int)
    if not month or not year:
        return jsonify({'error': 'Month and year required'}), 400
    result = get_doctor_revenue(doctor_id, month, year)
    return jsonify(result)

@revenue_bp.route('/hospital/<int:hospital_id>', methods=['GET'])
@token_required
def hospital_revenue(hospital_id):
    month = request.args.get('month', type=int)
    year = request.args.get('year', type=int)
    if not month or not year:
        return jsonify({'error': 'Month and year required'}), 400
    result = get_hospital_revenue(hospital_id, month, year)
    return jsonify(result)