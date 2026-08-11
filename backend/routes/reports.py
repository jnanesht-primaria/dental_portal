from flask import Blueprint, request, jsonify, send_file
from services.report_service import generate_excel_report
from utils.jwt_utils import token_required
from datetime import datetime
import os

report_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@report_bp.route('/excel', methods=['POST'])
@token_required
def export_excel():
    try:
        data = request.json
        date_from = datetime.strptime(data['date_from'], '%Y-%m-%d').date()
        date_to = datetime.strptime(data['date_to'], '%Y-%m-%d').date()
        doctor_id = data.get('doctor_id')
        hospital_id = data.get('hospital_id')
        
        filepath = generate_excel_report(date_from, date_to, doctor_id, hospital_id)
        return send_file(filepath, as_attachment=True, download_name=os.path.basename(filepath))
    except Exception as e:
        return jsonify({'error': str(e)}), 400