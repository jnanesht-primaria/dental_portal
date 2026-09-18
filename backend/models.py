# backend/models.py
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Enum, Numeric, func

db = SQLAlchemy()

# Association table for many-to-many Doctor <-> Hospital
doctor_hospital = db.Table(
    'doctor_hospital',
    db.Column('doctor_id', db.Integer,
              db.ForeignKey('doctors.id', ondelete='CASCADE'),
              primary_key=True),
    db.Column('hospital_id', db.Integer,
              db.ForeignKey('hospitals.id', ondelete='CASCADE'),
              primary_key=True),
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
    hospitals = db.relationship(
        'Hospital',
        secondary=doctor_hospital,
        backref=db.backref('doctors', lazy='dynamic', passive_deletes=True),
    )
    entries = db.relationship(
        'DentalEntry', backref='doctor', lazy=True, passive_deletes=True
    )


class Hospital(db.Model):
    __tablename__ = 'hospitals'
    id = db.Column(db.Integer, primary_key=True)
    hospital_name = db.Column(db.String(150), nullable=False, unique=True)
    contact_person = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    address = db.Column(db.String(200))
    status = db.Column(db.Enum('Active', 'Inactive'), default='Active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    entries = db.relationship(
        'DentalEntry', backref='hospital', lazy=True, passive_deletes=True
    )


class DentalEntry(db.Model):
    __tablename__ = 'dental_entries'
    id = db.Column(db.Integer, primary_key=True)
    entry_no = db.Column(db.String(20), unique=True, nullable=False)
    entry_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)

    # ---- Month-based entry support ----
    # If entry_type == 'month', entry_month holds e.g. '2026-08' (YYYY-MM)
    entry_type = db.Column(db.Enum('date', 'month'), default='date')
    entry_month = db.Column(db.String(7))  # 'YYYY-MM'

    doctor_id = db.Column(
        db.Integer,
        db.ForeignKey('doctors.id', ondelete='CASCADE'),
        nullable=False,
    )
    hospital_id = db.Column(
        db.Integer,
        db.ForeignKey('hospitals.id', ondelete='CASCADE'),
        nullable=False,
    )
    patient_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    no_of_units = db.Column(db.Integer, default=1)

    # ---- Rate per unit ----
    rate_per_unit = db.Column(Numeric(10, 2), nullable=False, default=0)

    shade_type = db.Column(db.String(20))
    work_type = db.Column(db.String(50))
    amount = db.Column(Numeric(10, 2), nullable=False)
    paid_amount = db.Column(Numeric(10, 2), nullable=False, default=0)
    balance_amount = db.Column(Numeric(10, 2), nullable=False, default=0)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)


class BalanceCarry(db.Model):
    """
    Tracks monthly financial state for a (doctor, hospital?, month):

      - previous_balance   : amount carried INTO this month
      - paid_amount        : amount the doctor paid DURING this month
      - is_manual_override : True when user overrode previous_balance manually

    Computed (not stored):
      total_due = total_entries_amount + previous_balance
      remaining = total_due − paid_amount
    """
    __tablename__ = 'balance_carry'
    id = db.Column(db.Integer, primary_key=True)

    doctor_id = db.Column(
        db.Integer,
        db.ForeignKey('doctors.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    hospital_id = db.Column(
        db.Integer,
        db.ForeignKey('hospitals.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )
    month = db.Column(db.String(7), nullable=False, index=True)  # 'YYYY-MM'
    previous_balance = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    paid_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    is_manual_override = db.Column(db.Boolean, nullable=False, default=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        db.UniqueConstraint(
            'doctor_id', 'hospital_id', 'month',
            name='uq_balance_carry',
        ),
    )