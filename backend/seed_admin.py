"""
Seed / ensure a default admin account exists.

Usage (from the project root, with the venv active):
    python -m backend.seed_admin

Environment overrides (optional):
    ADMIN_EMAIL     (default: admin@example.com)
    ADMIN_PASSWORD  (default: admin123)
    ADMIN_NAME      (default: Platform Admin)

This is idempotent: if a user with ADMIN_EMAIL already exists, it is
promoted to the admin role (and its password is reset) instead of failing.
"""

import os

from backend.database import Base, SessionLocal, engine
from backend.models import User, UserRole
from backend.auth import get_password_hash


def seed_admin() -> None:
    # Make sure tables exist even on a fresh database.
    Base.metadata.create_all(bind=engine)

    admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    admin_name = os.getenv("ADMIN_NAME", "Platform Admin")

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == admin_email).first()

        if existing:
            existing.role = UserRole.admin
            existing.ai_access = True
            existing.password_hash = get_password_hash(admin_password)
            db.commit()
            print(f"[seed_admin] Updated existing user to admin: {admin_email}")
        else:
            admin = User(
                name=admin_name,
                email=admin_email,
                password_hash=get_password_hash(admin_password),
                role=UserRole.admin,
                ai_access=True,
            )
            db.add(admin)
            db.commit()
            print(f"[seed_admin] Created admin account: {admin_email}")

        print(f"[seed_admin] Login with -> email: {admin_email} | password: {admin_password}")
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        print(f"[seed_admin] Failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
