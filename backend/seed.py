# seed.py
from app import create_app
from models import db, User
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    # Check if admin exists
    admin = User.query.filter_by(email='admin@dentallab.local').first()
    if not admin:
        admin = User(
            username='admin',
            email='admin@dentallab.local',
            password_hash=generate_password_hash('Lab@Demo123'),
            full_name='Lab Administrator',
            role='admin'
        )
        db.session.add(admin)
        db.session.commit()
        print("Admin user created.")
    else:
        print("Admin user already exists.")