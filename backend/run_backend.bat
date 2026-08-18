@echo off
cd /d "C:\Program Files\Dental_lab\backend"
python -m waitress --host=0.0.0.0 --port=5000 --call app:create_app