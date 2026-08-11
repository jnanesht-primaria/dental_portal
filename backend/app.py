# backend/app.py
from flask import Flask
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

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)