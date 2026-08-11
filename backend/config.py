import os

class Config:
    # MySQL database
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_USER = os.environ.get('DB_USER', 'root')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', 'root')   # change to your password
    DB_NAME = os.environ.get('DB_NAME', 'dental_lab')

    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}?charset=utf8mb4"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET = os.environ.get('JWT_SECRET', 'super-secret-change-this')
    JWT_EXPIRY_HOURS = int(os.environ.get('JWT_EXPIRY_HOURS', 8))

    # Excel temp directory
    EXCEL_TEMP_DIR = os.path.join(os.path.dirname(__file__), 'temp_excel')