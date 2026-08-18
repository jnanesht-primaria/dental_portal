# backend/app.py
from flask import Flask, send_from_directory
from flask_cors import CORS
from config import Config
from models import db
from routes.auth import auth_bp
from routes.doctors import doctor_bp
from routes.hospitals import hospital_bp
from routes.entries import entry_bp
from routes.revenue import revenue_bp
from routes.reports import report_bp
from routes.dashboard import dashboard_bp
import os

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Disable strict slashes to prevent redirects
    app.url_map.strict_slashes = False

    # Enable CORS
    CORS(app)

    db.init_app(app)

    # Register blueprints with strict_slashes=False (extra safety)
    app.register_blueprint(auth_bp, strict_slashes=False)
    app.register_blueprint(doctor_bp, strict_slashes=False)
    app.register_blueprint(hospital_bp, strict_slashes=False)
    app.register_blueprint(entry_bp, strict_slashes=False)
    app.register_blueprint(revenue_bp, strict_slashes=False)
    app.register_blueprint(report_bp, strict_slashes=False)
    app.register_blueprint(dashboard_bp, strict_slashes=False)

    with app.app_context():
        db.create_all()

    # ------------------------------------------------------------
    # Serve React frontend static files (moved inside create_app)
    # This must come AFTER all API blueprints
    # ------------------------------------------------------------
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        static_dir = os.path.join(os.path.dirname(__file__), 'static')
        if path and os.path.exists(os.path.join(static_dir, path)):
            return send_from_directory(static_dir, path)
        else:
            return send_from_directory(static_dir, 'index.html')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)