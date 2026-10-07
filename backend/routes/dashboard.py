# backend/routes/dashboard.py
from flask import Blueprint, jsonify
from services.dashboard_service import get_dashboard_stats
from utils.jwt_utils import token_required

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')


@dashboard_bp.route('/stats', methods=['GET'])
@token_required
def dashboard_stats():
    try:
        stats = get_dashboard_stats()
        return jsonify(stats), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Return a safe, fully-shaped payload even on hard failure.
        return jsonify({
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
            'error': str(e),
        }), 200