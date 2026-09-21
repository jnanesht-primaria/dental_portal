from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Enum, Numeric, func

db = SQLAlchemy()

# Association table for many-to-many Doctor <-> Hospital
doctor_hospital = db.Table('doctor_hospital',
    db.Column('doctor_id', db.Integer, db.ForeignKey('doctors.id', ondelete='CASCADE'), primary_key=True),
    db.Column('hospital_id', db.Integer, db.ForeignKey('hospitals.id', ondelete='CASCADE'), primary_key=True)
)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.Enum('admin', 'technician', 'front_desk'), default='front_desk')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Doctor(db.Model):
    __tablename__ = 'doctors'
    id = db.Column(db.Integer, primary_key=True)
    doctor_name = db.Column(db.String(100), nullable=False)
    designation = db.Column(db.String(100))
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120))
    address = db.Column(db.String(200))
    role = db.Column(db.String(100))          # e.g., Prosthodontist
    status = db.Column(db.Enum('Active', 'Inactive'), default='Active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    hospitals = db.relationship('Hospital', secondary=doctor_hospital,
                                backref=db.backref('doctors', lazy='dynamic', passive_deletes=True))
    entries = db.relationship('DentalEntry', backref='doctor', lazy=True, passive_deletes=True)

class Hospital(db.Model):
    __tablename__ = 'hospitals'
    id = db.Column(db.Integer, primary_key=True)
    hospital_name = db.Column(db.String(150), nullable=False, unique=True)
    contact_person = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    address = db.Column(db.String(200))
    status = db.Column(db.Enum('Active', 'Inactive'), default='Active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    entries = db.relationship('DentalEntry', backref='hospital', lazy=True, passive_deletes=True)
class DentalEntry(db.Model):
    __tablename__ = 'dental_entries'
    id = db.Column(db.Integer, primary_key=True)
    entry_no = db.Column(db.String(20), unique=True, nullable=False)
    entry_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id', ondelete='CASCADE'), nullable=False)
    hospital_id = db.Column(db.Integer, db.ForeignKey('hospitals.id', ondelete='CASCADE'), nullable=False)
    patient_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    no_of_units = db.Column(db.Integer, default=1)
    shade_type = db.Column(db.String(20))
    work_type = db.Column(db.String(50))
    amount = db.Column(Numeric(10,2), nullable=False)
    paid_amount = db.Column(Numeric(10,2), nullable=False, default=0)
    balance_amount = db.Column(Numeric(10,2), nullable=False, default=0)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)