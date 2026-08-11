from flask import Blueprint, jsonify
from services.dashboard_service import get_dashboard_stats
from utils.jwt_utils import token_required

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/stats', methods=['GET'])
@token_required
def dashboard_stats():
    stats = get_dashboard_stats()
    return jsonify(stats)