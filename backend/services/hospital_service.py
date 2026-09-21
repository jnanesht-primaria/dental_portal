from models import db, Hospital

def create_hospital(data):
    hospital = Hospital(
        hospital_name=data['hospital_name'],
        contact_person=data.get('contact_person'),
        phone=data.get('phone'),
        address=data.get('address'),
        status=data.get('status', 'Active')
    )
    db.session.add(hospital)
    db.session.commit()
    return hospital

def get_all_hospitals(active_only=False):
    query = Hospital.query
    if active_only:
        query = query.filter_by(status='Active')
    return query.all()

def get_hospital(hospital_id):
    return Hospital.query.get(hospital_id)

def update_hospital(hospital_id, data):
    hospital = Hospital.query.get_or_404(hospital_id)
    for key, value in data.items():
        if hasattr(hospital, key) and value is not None:
            setattr(hospital, key, value)
    db.session.commit()
    return hospital