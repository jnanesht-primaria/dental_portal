from models import db, Doctor, Hospital, doctor_hospital
from sqlalchemy.exc import IntegrityError

def create_doctor(data):
    doctor = Doctor(
        doctor_name=data['doctor_name'],
        designation=data.get('designation'),
        phone=data['phone'],
        email=data.get('email'),
        address=data.get('address'),
        role=data.get('role'),
        status=data.get('status', 'Active')
    )
    db.session.add(doctor)
    db.session.flush()   # to get doctor.id
    
    # Link hospitals (if provided)
    hospital_ids = data.get('hospital_ids', [])
    if hospital_ids:
        hospitals = Hospital.query.filter(Hospital.id.in_(hospital_ids)).all()
        doctor.hospitals = hospitals
    
    db.session.commit()
    return doctor

def get_all_doctors(active_only=False):
    query = Doctor.query
    if active_only:
        query = query.filter_by(status='Active')
    return query.all()

def get_doctor(doctor_id):
    return Doctor.query.get(doctor_id)

def update_doctor(doctor_id, data):
    doctor = Doctor.query.get_or_404(doctor_id)
    for key, value in data.items():
        if key == 'hospital_ids':
            continue   # handle separately
        if hasattr(doctor, key) and value is not None:
            setattr(doctor, key, value)
    # Update hospital links
    if 'hospital_ids' in data:
        hospitals = Hospital.query.filter(Hospital.id.in_(data['hospital_ids'])).all()
        doctor.hospitals = hospitals
    db.session.commit()
    return doctor

def delete_doctor(doctor_id):
    doctor = Doctor.query.get_or_404(doctor_id)
    db.session.delete(doctor)
    db.session.commit()