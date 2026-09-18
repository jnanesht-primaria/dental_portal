@echo off
cd /d "C:\Users\Admin\Desktop\Dental_lab\backend"
call venv\Scripts\activate
python -m waitress --host=0.0.0.0 --port=5000 --call app:create_app
pause