import sys
import os
from sqlalchemy.orm import Session
from backend.database import engine, SessionLocal
from backend.models import User, Expert, UserRole
from backend.auth import get_password_hash

def seed_experts():
    db = SessionLocal()
    
    print("Seeding database with default service providers...")

    experts_data = [
        # Doctors
        {
            "name": "Dr. Aarav Sharma",
            "email": "aarav.sharma@example.com",
            "category": "doctor",
            "specialization": "Cardiologist",
            "bio": "Over 15 years of experience in diagnosing and treating heart conditions. Former Head of Cardiology at AIIMS.",
            "fee": 1200,
            "rating": 4.9,
            "exp": 15
        },
        {
            "name": "Dr. Priya Patel",
            "email": "priya.patel@example.com",
            "category": "doctor",
            "specialization": "Dermatologist",
            "bio": "Specialist in cosmetic dermatology and skin conditions. Featured in Vogue Health.",
            "fee": 800,
            "rating": 4.7,
            "exp": 8
        },
        {
            "name": "Dr. Rohan Gupta",
            "email": "rohan.gupta@example.com",
            "category": "doctor",
            "specialization": "Pediatrician",
            "bio": "Dedicated to children's health from infancy to adolescence. Friendly and compassionate approach.",
            "fee": 600,
            "rating": 4.8,
            "exp": 10
        },
        {
            "name": "Dr. Neha Singh",
            "email": "neha.singh@example.com",
            "category": "doctor",
            "specialization": "Psychiatrist",
            "bio": "Mental health professional specializing in anxiety, depression, and stress management.",
            "fee": 1500,
            "rating": 5.0,
            "exp": 12
        },
        {
            "name": "Dr. Amit Verma",
            "email": "amit.verma@example.com",
            "category": "doctor",
            "specialization": "General Physician",
            "bio": "Your first point of contact for any health concerns. Focuses on holistic wellness.",
            "fee": 500,
            "rating": 4.6,
            "exp": 5
        },
        # Teachers
        {
            "name": "Prof. Vikram Reddy",
            "email": "vikram.reddy@example.com",
            "category": "teacher",
            "specialization": "Mathematics & Physics",
            "bio": "IIT Bombay alumnus with a passion for making complex mathematical concepts easy to understand.",
            "fee": 400,
            "rating": 4.9,
            "exp": 20
        },
        {
            "name": "Sarah Jenkins",
            "email": "sarah.jenkins@example.com",
            "category": "teacher",
            "specialization": "English Language & IELTS",
            "bio": "Native English speaker and certified TEFL instructor. Helped over 500 students clear their IELTS.",
            "fee": 600,
            "rating": 4.8,
            "exp": 7
        },
        {
            "name": "Rahul Desai",
            "email": "rahul.desai@example.com",
            "category": "teacher",
            "specialization": "Computer Science (Python/JS)",
            "bio": "Senior Software Engineer at a top tech company. I teach coding the way it's used in the industry.",
            "fee": 1000,
            "rating": 5.0,
            "exp": 6
        },
        {
            "name": "Ananya Joshi",
            "email": "ananya.joshi@example.com",
            "category": "teacher",
            "specialization": "History & Political Science",
            "bio": "PhD holder and university lecturer. My classes are storytelling sessions that you won't forget.",
            "fee": 300,
            "rating": 4.5,
            "exp": 4
        },
        {
            "name": "Karan Malhotra",
            "email": "karan.malhotra@example.com",
            "category": "teacher",
            "specialization": "Business & Economics",
            "bio": "MBA graduate specializing in micro and macro economics. Great for college prep.",
            "fee": 800,
            "rating": 4.7,
            "exp": 9
        }
    ]

    for data in experts_data:
        try:
            user = User(
                name=data["name"],
                email=data["email"],
                password_hash=get_password_hash("password123"), # Default password for testing
                role=UserRole.expert,
            )
            db.add(user)
            db.flush() # To get user.id

            expert = Expert(
                user_id=user.id,
                category=data["category"],
                specialization=data["specialization"],
                experience_years=data["exp"],
                bio=data["bio"],
                consultation_fee=data["fee"],
                rating=data["rating"],
                is_verified=True,
            )
            db.add(expert)
            print(f"Added: {data['name']}")
        except Exception as e:
            db.rollback()
            print(f"Failed to add {data['name']}: {str(e)}")

    db.commit()
    db.close()
    print("Seeding complete! Added 10 service providers.")

if __name__ == "__main__":
    seed_experts()
