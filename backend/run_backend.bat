@echo off
cd /d "C:\Primaria\dental_portal-main\backend"

call venv\Scripts\activate.bat

python -m waitress --host=0.0.0.0 --port=5000 --call app:create_app

pause