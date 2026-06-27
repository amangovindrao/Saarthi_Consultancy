# Saarthi Consultancy - Project Context

This document serves as a comprehensive summary of the Saarthi Consultancy project. It outlines the current architecture, completed features, role-based access controls, and a detailed roadmap of what needs to be changed or added next. **Use this file as context when starting a new AI chat to bring the AI up to speed immediately.**

---

## 1. Tech Stack & Architecture

*   **Frontend**: Next.js 15 (App Router), React, Tailwind CSS.
*   **Aesthetic**: Modern Minimalist, utilizing glassmorphism (`backdrop-blur`), subtle gradients, `rounded-2xl` cards, and smooth CSS animations (`slideUp`, `fadeIn`).
*   **Backend**: FastAPI (Python).
*   **Database**: SQLite (`consultant_ai.db`) using SQLAlchemy ORM.
*   **Authentication**: JWT (JSON Web Tokens) with strict role-based access control (RBAC).

---

## 2. Implemented Features & Workflows

The platform supports three distinct user roles: **User**, **Expert**, and **Admin**. The UI and routing are strictly isolated to prevent unauthorized access.

### 👥 User Features
*   **Authentication**: Standard Sign Up and Sign In.
*   **Find Experts**: Browse a directory of verified service providers (e.g., Doctors, Teachers).
*   **Multi-Step Booking Wizard**: 
    *   Choose reason, urgency, and preferred language.
    *   **Meeting Type**: Select between **Online Video Call** or **Offline (In-Person Clinic)**.
    *   **Payment**: Currently configured for **Cash / Pay at Clinic** to bypass online payment verification errors.
*   **User Dashboard**: View upcoming appointments and access the AI features.
*   **Messaging**: A dedicated chat interface (`/messages/[id]`) to communicate with the booked expert.

### 👨‍⚕️ Expert Features
*   **Expert Registration (`/register/expert`)**: A specialized sign-up flow. New experts are placed in a **Pending Approval** state and are not visible to users until verified by an Admin.
*   **Expert Workspace (`/expert-panel`)**: 
    *   **Overview Stats**: Track total bookings, completed sessions, total earnings, and average rating.
    *   **Appointment Management**: View booking requests and update statuses (`pending` -> `confirmed` -> `completed`).
*   **Unified Profile (`/profile`)**: Update personal details, category, specialization, consultation fee, years of experience, and biography.

### 🛡️ Admin Features
*   **Default Credentials**: `admin@example.com` / `admin123`
*   **Admin Control Panel (`/admin`)**:
    *   **Platform Overview**: View total users, verified experts, platform-wide bookings, and total revenue.
    *   **Verification Queue**: Review pending expert applications and approve them with a single click.
    *   **Master Booking Ledger**: A comprehensive table showing every booking on the platform (who booked whom, when, meeting type, and fee).

### ✨ AI Integration
*   **AI Character Component**: A visual, animated canvas-based AI orb (`AICharacter.jsx`) that reacts with different states (idle, thinking, speaking, listening).
*   **Current State**: The AI backend is currently using a rule-based mock system.

---

## 3. Immediate Fixes Needed (What to Change)

When continuing development, prioritize these changes:

1.  **Payment Gateway Re-integration**:
    *   *Issue*: Razorpay verification was throwing "Invalid request payload" errors, so it was temporarily bypassed in favor of "Cash Only".
    *   *Fix*: Correct the payload keys in `booking/[id]/page.jsx` to match what the backend expects (`razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`) and re-enable online payments.
2.  **Database Migrations (Alembic)**:
    *   *Issue*: Currently relying on `Base.metadata.create_all()`. When models change (like adding `meeting_type`), the SQLite database throws errors because tables aren't automatically altered.
    *   *Fix*: Set up Alembic to manage database schema migrations properly.
3.  **UI Consistency**:
    *   Ensure dark mode/light mode variables in `globals.css` do not conflict with hardcoded Tailwind classes (e.g., `bg-white`) on specific pages.

---

## 4. Future Roadmap (What to Add)

Features required to make the platform production-ready:

### 🧠 Advanced AI Capabilities
*   **LLM Integration**: Replace the mock AI backend with a real LLM (e.g., OpenAI, Google Gemini).
*   **Voice Interactivity**: Implement Speech-to-Text (STT) and Text-to-Speech (TTS). Specifically, add support for **Hinglish** and **Indian English accents** as previously requested.

### 📹 Video Call Infrastructure
*   The "Online Video Call" meeting type needs a functional WebRTC implementation.
*   Integrate a service like Jitsi Meet, Daily.co, or Twilio Video to dynamically generate secure meeting rooms for confirmed bookings.

### 🖼️ Media & File Uploads
*   **Profile Avatars**: Allow users and experts to upload profile pictures.
*   **Document Sharing**: Allow users to upload medical reports or documents within the messaging interface.
*   *Implementation*: Integrate AWS S3, Cloudinary, or a local file upload router.

### 📧 Notifications System
*   Implement background tasks (e.g., Celery or FastAPI BackgroundTasks).
*   Send Email/SMS confirmations when a booking is created, approved, or cancelled.

### 🚀 Production Deployment
*   Migrate the database from SQLite to **PostgreSQL**.
*   Configure environment variables securely for production (Hostinger, Vercel, or AWS).
