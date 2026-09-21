"""
Create (or update) a login account for the dental lab app.

Usage:
    python create_user.py <username> <email> <password> <full_name> [role]

Example:
    python create_user.py jsmith jsmith@dentallab.local "MyS3cure!Pass" "Jane Smith" technician

role defaults to 'technician'. Valid roles: admin, technician, front_desk
"""
import os
import sys

import pymysql
from werkzeug.security import generate_password_hash

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "user": os.environ.get("DB_USER", "root"),
    "password": os.environ.get("DB_PASSWORD", ""),
    "database": os.environ.get("DB_NAME", "dental_lab"),
}


def main():
    if len(sys.argv) < 5:
        print(__doc__)
        sys.exit(1)

    username, email, password, full_name = sys.argv[1:5]
    role = sys.argv[5] if len(sys.argv) > 5 else "technician"
    if role not in ("admin", "technician", "front_desk"):
        print(f"Invalid role '{role}'. Use admin, technician, or front_desk.")
        sys.exit(1)

    password_hash = generate_password_hash(password)

    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (username, email, password_hash, full_name, role)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    email = VALUES(email),
                    password_hash = VALUES(password_hash),
                    full_name = VALUES(full_name),
                    role = VALUES(role)
                """,
                (username, email, password_hash, full_name, role),
            )
        conn.commit()
        print(f"User '{username}' saved with role '{role}'.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
