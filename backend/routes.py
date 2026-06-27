from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
import logging
import os
import uuid

from .auth import create_access_token, get_current_user, get_password_hash, verify_password
from .database import get_db
from .models import Booking, Expert, Message, Payment, User, UserRole
from .schemas import (
    BookingCreate,
    BookingResponse,
    ExpertListResponse,
    ExpertRegister,
    ExpertResponse,
    MessageCreate,
    MessageResponse,
    PaymentCreate,
    PaymentVerify,
    Token,
    UserCreate,
    UserLogin,
    ReviewCreate,
    AIQuery,
    AIResponse,
    AIChatRequest,
    AIChatResponse,
    AdminBookingResponse,
    ExpertProfileUpdate,
    UserProfileUpdate,
)

router = APIRouter(tags=["auth"])
logger = logging.getLogger(__name__)


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, db: Session = Depends(get_db)) -> dict:
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    try:
        user = User(
            name=payload.name,
            email=payload.email,
            password_hash=get_password_hash(payload.password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return {"message": "User registered successfully"}
    except IntegrityError as exc:
        db.rollback()
        logger.exception("Register failed with integrity error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Register database error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while creating user",
        ) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Register unexpected error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error while creating user",
        ) from exc


@router.post("/register/expert", status_code=status.HTTP_201_CREATED)
def register_expert(payload: ExpertRegister, db: Session = Depends(get_db)) -> dict:
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    try:
        user = User(
            name=payload.name,
            email=payload.email,
            password_hash=get_password_hash(payload.password),
            role=UserRole.expert,
        )
        db.add(user)
        db.flush() # flush to get user.id
        
        expert = Expert(
            user_id=user.id,
            category=payload.category.lower(),
            specialization=payload.specialization,
            consultation_fee=payload.consultation_fee,
            is_verified=False, # Requires Admin Approval
        )
        db.add(expert)
        db.commit()
        return {"message": "Expert registered successfully"}
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered") from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error") from exc



@router.post("/login")
def login_user(payload: UserLogin, db: Session = Depends(get_db)) -> dict:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(data={"sub": user.email})
    role = str(user.role.value) if hasattr(user.role, "value") else str(user.role)
    if "." in role: role = role.split(".")[-1]
    return {"access_token": access_token, "token_type": "bearer", "role": role}


@router.get("/experts", response_model=ExpertListResponse, tags=["experts"])
def get_experts(category: str | None = None, db: Session = Depends(get_db)) -> ExpertListResponse:
    query = (
        db.query(Expert, User.name)
        .join(User, Expert.user_id == User.id)
        .filter(Expert.is_verified.is_(True))
    )

    if category:
        normalized_category = category.strip().lower()
        query = query.filter(Expert.category == normalized_category)

    results = query.all()

    experts = [
        ExpertResponse(
            id=expert.id,
            name=user_name,
            category=expert.category,
            specialization=expert.specialization,
            experience_years=expert.experience_years,
            bio=expert.bio,
            consultation_fee=float(expert.consultation_fee),
            rating=expert.rating,
        )
        for expert, user_name in results
    ]

    return ExpertListResponse(experts=experts)


@router.get("/experts/{expert_id}", response_model=ExpertResponse, tags=["experts"])
def get_expert_profile(expert_id: int, db: Session = Depends(get_db)) -> ExpertResponse:
    result = (
        db.query(Expert, User.name)
        .join(User, Expert.user_id == User.id)
        .filter(Expert.id == expert_id, Expert.is_verified.is_(True))
        .first()
    )

    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expert not found")

    expert, user_name = result
    return ExpertResponse(
        id=expert.id,
        name=user_name,
        category=expert.category,
        specialization=expert.specialization,
        experience_years=expert.experience_years,
        bio=expert.bio,
        consultation_fee=float(expert.consultation_fee),
        rating=expert.rating,
    )


def _build_booking_response(booking: Booking) -> BookingResponse:
    return BookingResponse(
        id=booking.id,
        expert_id=booking.expert_id,
        booking_time=booking.booking_time,
        status=booking.status.value if hasattr(booking.status, "value") else str(booking.status),
        reason=booking.reason,
        meeting_type=booking.meeting_type,
        notes=booking.notes,
        urgency=booking.urgency,
        preferred_language=booking.preferred_language,
        payment_method=booking.payment_method,
    )


@router.post("/book", response_model=BookingResponse, tags=["bookings"])
def create_booking(
    payload: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookingResponse:
    expert = db.query(Expert).filter(Expert.id == payload.expert_id, Expert.is_verified.is_(True)).first()
    if expert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expert not found")

    booking = Booking(
        user_id=current_user.id,
        expert_id=payload.expert_id,
        booking_time=payload.booking_time,
        reason=payload.reason,
        meeting_type=payload.meeting_type,
        notes=payload.notes,
        urgency=payload.urgency,
        preferred_language=payload.preferred_language,
        payment_method=payload.payment_method,
        status="pending",
    )
    db.add(booking)
    db.flush()
    booking.video_room_id = f"room_{booking.id}"
    db.commit()
    db.refresh(booking)

    return _build_booking_response(booking)


@router.get("/my-bookings", response_model=list[BookingResponse], tags=["bookings"])
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BookingResponse]:
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == current_user.id)
        .order_by(Booking.booking_time.desc())
        .all()
    )

    return [_build_booking_response(b) for b in bookings]


@router.post("/create-order", tags=["payments"])
def create_order(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Mock payment: returns a fake order_id. No real gateway."""
    booking = db.query(Booking).filter(Booking.id == payload.booking_id).first()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized booking access")

    order_id = f"mock_order_{uuid.uuid4().hex[:16]}"
    booking.payment_id = order_id
    db.commit()

    return {
        "order_id": order_id,
        "amount": payload.amount,
        "currency": "INR",
        "status": "created",
    }


@router.post("/verify-payment", tags=["payments"])
def verify_payment(
    payload: PaymentVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Mock verification: always succeeds, confirms the booking."""
    booking = db.query(Booking).filter(Booking.id == payload.booking_id).first()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized booking access")

    expert = db.query(Expert).filter(Expert.id == booking.expert_id).first()
    if expert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expert not found")

    payment = Payment(
        user_id=current_user.id,
        booking_id=booking.id,
        amount=float(expert.consultation_fee),
        status="paid",
        transaction_id=payload.payment_id,
    )
    booking.status = "confirmed"

    db.add(payment)
    db.commit()

    return {"message": "Payment verified and booking confirmed", "status": "success"}


@router.get("/video-token", tags=["video"])
def generate_video_token(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Mock video token: returns a dummy token and room id."""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized booking access")

    booking_status = booking.status.value if hasattr(booking.status, "value") else str(booking.status)
    if booking_status != "confirmed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking is not confirmed")

    room_id = booking.video_room_id or f"room_{booking.id}"
    dummy_token = f"mock_token_{uuid.uuid4().hex[:24]}"

    return {
        "token": dummy_token,
        "room_id": room_id,
    }


# ---------------------------------------------------------------------------
# Smart AI Chatbot — handles general help AND conversational booking
# ---------------------------------------------------------------------------

def _ai_general_response(query: str, context: list[dict] | None, db: Session) -> AIResponse:
    """Handle general knowledge queries and detect booking intent."""
    q = query.lower()

    # Booking intent detection
    booking_keywords = ["book", "appointment", "schedule", "consult", "want to see", "need a doctor", "need a teacher", "find me"]
    if any(kw in q for kw in booking_keywords):
        # Check if they already specified a category
        if "doctor" in q or "medical" in q or "health" in q:
            experts = _fetch_experts_by_category("doctor", db)
            if experts:
                expert_lines = "\n".join(
                    [f"**{i+1}. {e['name']}** — {e['specialization']} | ⭐ {e['rating']} | ₹{e['fee']}" for i, e in enumerate(experts)]
                )
                return AIResponse(
                    response=f"Here are our available doctors:\n\n{expert_lines}\n\nType the number (e.g., '1') to select an expert.",
                    action="select_expert",
                    data={"experts": experts, "category": "doctor"},
                )
            return AIResponse(response="No doctors available right now. Please check back later!", action=None)

        elif "teacher" in q or "academic" in q or "study" in q or "learn" in q:
            experts = _fetch_experts_by_category("teacher", db)
            if experts:
                expert_lines = "\n".join(
                    [f"**{i+1}. {e['name']}** — {e['specialization']} | ⭐ {e['rating']} | ₹{e['fee']}" for i, e in enumerate(experts)]
                )
                return AIResponse(
                    response=f"Here are our available teachers:\n\n{expert_lines}\n\nType the number (e.g., '1') to select an expert.",
                    action="select_expert",
                    data={"experts": experts, "category": "teacher"},
                )
            return AIResponse(response="No teachers available right now. Please check back later!", action=None)

        return AIResponse(
            response="I can help you book a consultation! What type of expert are you looking for?\n\n🩺 **Doctor** — Medical consultations\n📚 **Teacher** — Academic guidance\n\nJust click or type 'doctor' or 'teacher' to get started.",
            action="ask_category",
            suggestions=["Doctor", "Teacher"]
        )

    # Category selection (during booking flow)
    if context:
        last_action = None
        for msg in reversed(context):
            if msg.get("action"):
                last_action = msg["action"]
                break

        if last_action == "ask_category":
            if "doctor" in q or "medical" in q or "health" in q:
                experts = _fetch_experts_by_category("doctor", db)
                if experts:
                    expert_lines = "\n".join(
                        [f"**{i+1}. {e['name']}** — {e['specialization']} | ⭐ {e['rating']} | ₹{e['fee']}" for i, e in enumerate(experts)]
                    )
                    return AIResponse(
                        response=f"Here are our available doctors:\n\n{expert_lines}\n\nType the number (e.g., '1') to select an expert.",
                        action="select_expert",
                        data={"experts": experts, "category": "doctor"},
                    )
                return AIResponse(response="No doctors available right now. Please check back later!", action=None)

            elif "teacher" in q or "academic" in q or "study" in q or "learn" in q:
                experts = _fetch_experts_by_category("teacher", db)
                if experts:
                    expert_lines = "\n".join(
                        [f"**{i+1}. {e['name']}** — {e['specialization']} | ⭐ {e['rating']} | ₹{e['fee']}" for i, e in enumerate(experts)]
                    )
                    return AIResponse(
                        response=f"Here are our available teachers:\n\n{expert_lines}\n\nType the number (e.g., '1') to select an expert.",
                        action="select_expert",
                        data={"experts": experts, "category": "teacher"},
                    )
                return AIResponse(response="No teachers available right now. Please check back later!", action=None)

        if last_action == "select_expert":
            # Try to parse expert selection
            prev_data = None
            for msg in reversed(context):
                if msg.get("data") and msg["data"].get("experts"):
                    prev_data = msg["data"]
                    break
            if prev_data and prev_data.get("experts"):
                experts_list = prev_data["experts"]
                try:
                    idx = int(q.strip()) - 1
                    if 0 <= idx < len(experts_list):
                        selected = experts_list[idx]
                        return AIResponse(
                            response=f"Great choice! You selected **{selected['name']}** (₹{selected['fee']}).\n\nPlease tell me:\n📅 **When** would you like the consultation? (e.g., 'tomorrow at 10am', '25 April 3pm')\n📝 **What is the reason** for this consultation?",
                            action="collect_details",
                            data={"selected_expert": selected},
                        )
                except (ValueError, IndexError):
                    pass
                return AIResponse(
                    response=f"Please type a valid number between 1 and {len(experts_list)} to select an expert.",
                    action="select_expert",
                    data=prev_data,
                )

        if last_action == "collect_details":
            prev_data = None
            for msg in reversed(context):
                if msg.get("data") and msg["data"].get("selected_expert"):
                    prev_data = msg["data"]
                    break
            if prev_data:
                selected = prev_data["selected_expert"]
                return AIResponse(
                    response=f"Perfect! Here's your booking summary:\n\n🧑‍⚕️ **Expert:** {selected['name']}\n💰 **Fee:** ₹{selected['fee']}\n📋 **Your message:** {query}\n\nTo confirm this booking, please click the button below or go to the expert's profile page to complete payment.",
                    action="confirm_booking",
                    data={"selected_expert": selected, "user_notes": query},
                )

    # General help responses
    if "pay" in q or "cost" in q or "fee" in q or "price" in q:
        return AIResponse(
            response="💰 Consultation fees are displayed on each expert's profile card. Payment is processed securely when you confirm your booking. We accept all major payment methods.",
        )
    elif "video" in q or "join" in q or "call" in q:
        return AIResponse(
            response="📹 Once your booking is confirmed and paid, a **'Join Call'** button will appear in your Dashboard at the scheduled time. Make sure your camera and microphone are ready!",
        )
    elif "refund" in q or "cancel" in q:
        return AIResponse(
            response="🔄 For cancellations and refunds, please contact our support team. Refunds typically process within 3-5 business days.",
        )
    elif "register" in q or "sign up" in q or "account" in q:
        return AIResponse(
            response="📝 To create an account, click **'Get Started'** in the top navigation. You'll need your name, email, and a password. Once registered, you can browse experts and book consultations!",
        )
    elif "how" in q and ("work" in q or "use" in q or "start" in q):
        return AIResponse(
            response="Here's how our platform works:\n\n1️⃣ **Browse Experts** — Find doctors & teachers on the Experts page\n2️⃣ **View Profiles** — Check their specialization, experience & fees\n3️⃣ **Book & Pay** — Pick a time, fill details, and pay securely\n4️⃣ **Join Session** — Video call at the scheduled time\n5️⃣ **Rate & Review** — Share your experience\n\nOr just tell me 'I want to book' and I'll guide you through it! 🚀",
        )
    elif "hi" in q or "hello" in q or "hey" in q:
        return AIResponse(
            response="👋 Hello! Welcome to Saarthi Consultancy. I can help you:\n\n• **Book a consultation** — just say 'book'\n• **Find experts** — ask about doctors or teachers\n• **Answer questions** — about payments, video calls, etc.\n\nWhat would you like to do?",
        )
    else:
        return AIResponse(
            response="I'm your Saarthi Consultancy Assistant! Here's what I can help with:\n\n🔍 **Find experts** — 'show me doctors'\n📅 **Book consultations** — 'I want to book'\n💳 **Payment info** — 'how do I pay?'\n📹 **Video calls** — 'how to join call?'\n\nJust ask me anything!",
        )


def _fetch_experts_by_category(category: str, db: Session) -> list[dict]:
    """Fetch verified experts by category for chatbot display."""
    results = (
        db.query(Expert, User.name)
        .join(User, Expert.user_id == User.id)
        .filter(Expert.is_verified.is_(True), Expert.category == category)
        .all()
    )
    return [
        {
            "id": expert.id,
            "name": user_name,
            "specialization": expert.specialization or "General",
            "rating": round(expert.rating, 1),
            "fee": float(expert.consultation_fee),
        }
        for expert, user_name in results
    ]


@router.post("/ai-help", response_model=AIResponse, tags=["ai"])
def get_ai_help(
    payload: AIQuery,
    db: Session = Depends(get_db),
) -> AIResponse:
    """Smart AI help — works without auth for general questions."""
    return _ai_general_response(payload.user_query, payload.conversation_context, db)


@router.post("/review", tags=["reviews"])
def create_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    booking = db.query(Booking).filter(Booking.id == payload.booking_id).first()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized booking access")
        
    booking_status = booking.status.value if hasattr(booking.status, "value") else str(booking.status)
    if booking_status not in ["confirmed", "completed"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only review confirmed or completed bookings")
        
    booking.rating = payload.rating
    booking.review_comment = payload.comment
    
    # Recalculate expert average rating
    expert = db.query(Expert).filter(Expert.id == booking.expert_id).first()
    if expert:
        all_expert_bookings = db.query(Booking).filter(Booking.expert_id == expert.id, Booking.rating.isnot(None)).all()
        if all_expert_bookings:
            total_rating = sum(b.rating for b in all_expert_bookings)
            expert.rating = total_rating / len(all_expert_bookings)

    db.commit()
    
    return {"message": "Review submitted successfully"}


@router.get("/admin/experts", response_model=ExpertListResponse, tags=["admin"])
def admin_get_experts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpertListResponse:
    # Ensure role exists and is admin
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
        
    results = db.query(Expert, User.name).join(User, Expert.user_id == User.id).all()
    
    experts = [
        ExpertResponse(
            id=expert.id,
            name=user_name,
            category=expert.category,
            specialization=expert.specialization,
            experience_years=expert.experience_years,
            bio=expert.bio,
            consultation_fee=float(expert.consultation_fee),
            rating=expert.rating,
        )
        for expert, user_name in results
    ]

    return ExpertListResponse(experts=experts)


# ---------------------------------------------------------------------------
# Messaging — post-booking chat between user and expert
# ---------------------------------------------------------------------------

@router.post("/messages", response_model=MessageResponse, tags=["messages"])
def send_message(
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    booking = db.query(Booking).filter(Booking.id == payload.booking_id).first()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    # Only the booking user or the expert's user can send messages
    expert = db.query(Expert).filter(Expert.id == booking.expert_id).first()
    expert_user_id = expert.user_id if expert else None

    if current_user.id != booking.user_id and current_user.id != expert_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to message in this booking")

    booking_status = booking.status.value if hasattr(booking.status, "value") else str(booking.status)
    if booking_status not in ["confirmed", "completed"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only message in confirmed or completed bookings")

    message = Message(
        booking_id=payload.booking_id,
        sender_id=current_user.id,
        content=payload.content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    return MessageResponse(
        id=message.id,
        booking_id=message.booking_id,
        sender_id=message.sender_id,
        sender_name=current_user.name,
        content=message.content,
        sent_at=message.sent_at,
    )


@router.get("/messages/{booking_id}", response_model=list[MessageResponse], tags=["messages"])
def get_messages(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MessageResponse]:
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    expert = db.query(Expert).filter(Expert.id == booking.expert_id).first()
    expert_user_id = expert.user_id if expert else None

    if current_user.id != booking.user_id and current_user.id != expert_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view these messages")

    messages = (
        db.query(Message, User.name)
        .join(User, Message.sender_id == User.id)
        .filter(Message.booking_id == booking_id)
        .order_by(Message.sent_at.asc())
        .all()
    )

    return [
        MessageResponse(
            id=msg.id,
            booking_id=msg.booking_id,
            sender_id=msg.sender_id,
            sender_name=sender_name,
            content=msg.content,
            sent_at=msg.sent_at,
        )
        for msg, sender_name in messages
    ]


# ---------------------------------------------------------------------------
# User Info (for frontend role detection)
# ---------------------------------------------------------------------------

@router.get("/me", tags=["auth"])
def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    result = {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": role,
        "ai_access": current_user.ai_access,
    }

    if role == "expert":
        expert = db.query(Expert).filter(Expert.user_id == current_user.id).first()
        if expert:
            result["expert_id"] = expert.id
            result["category"] = expert.category
            result["specialization"] = expert.specialization

    return result


# ---------------------------------------------------------------------------
# Expert Panel — service provider dashboard endpoints
# ---------------------------------------------------------------------------

@router.get("/expert-bookings", tags=["expert-panel"])
def get_expert_bookings(
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    expert = db.query(Expert).filter(Expert.user_id == current_user.id).first()
    if not expert:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an expert account")

    query = (
        db.query(Booking, User.name, User.email)
        .join(User, Booking.user_id == User.id)
        .filter(Booking.expert_id == expert.id)
    )

    if status_filter and status_filter != "all":
        query = query.filter(Booking.status == status_filter)

    bookings = query.order_by(Booking.booking_time.desc()).all()

    return [
        {
            "id": booking.id,
            "patient_name": user_name,
            "patient_email": user_email,
            "booking_time": booking.booking_time.isoformat(),
            "status": booking.status.value if hasattr(booking.status, "value") else str(booking.status),
            "reason": booking.reason,
            "notes": booking.notes,
            "urgency": booking.urgency,
            "preferred_language": booking.preferred_language,
            "payment_method": booking.payment_method,
            "rating": booking.rating,
            "review_comment": booking.review_comment,
        }
        for booking, user_name, user_email in bookings
    ]


@router.get("/expert-stats", tags=["expert-panel"])
def get_expert_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    expert = db.query(Expert).filter(Expert.user_id == current_user.id).first()
    if not expert:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an expert account")

    from sqlalchemy import func

    total = db.query(func.count(Booking.id)).filter(Booking.expert_id == expert.id).scalar() or 0
    confirmed = db.query(func.count(Booking.id)).filter(
        Booking.expert_id == expert.id, Booking.status == "confirmed"
    ).scalar() or 0
    completed = db.query(func.count(Booking.id)).filter(
        Booking.expert_id == expert.id, Booking.status == "completed"
    ).scalar() or 0
    pending = db.query(func.count(Booking.id)).filter(
        Booking.expert_id == expert.id, Booking.status == "pending"
    ).scalar() or 0

    # Total earnings from paid payments
    total_earnings = (
        db.query(func.sum(Payment.amount))
        .join(Booking, Payment.booking_id == Booking.id)
        .filter(Booking.expert_id == expert.id, Payment.status == "paid")
        .scalar()
    ) or 0

    # Average rating from bookings that have been rated
    avg_rating = (
        db.query(func.avg(Booking.rating))
        .filter(Booking.expert_id == expert.id, Booking.rating.isnot(None))
        .scalar()
    )

    return {
        "total_bookings": total,
        "confirmed": confirmed,
        "completed": completed,
        "pending": pending,
        "total_earnings": float(total_earnings),
        "avg_rating": round(float(avg_rating), 1) if avg_rating else expert.rating,
        "consultation_fee": float(expert.consultation_fee),
        "category": expert.category,
        "specialization": expert.specialization,
    }


@router.post("/expert-booking-status", tags=["expert-panel"])
def update_booking_status(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    expert = db.query(Expert).filter(Expert.user_id == current_user.id).first()
    if not expert:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an expert account")

    booking_id = payload.get("booking_id")
    new_status = payload.get("status")

    if new_status not in ["confirmed", "completed", "cancelled"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.expert_id == expert.id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    booking.status = new_status
    db.commit()

    return {"message": f"Booking #{booking_id} updated to {new_status}"}


@router.put("/expert-profile", tags=["expert-panel"])
def update_expert_profile(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    expert = db.query(Expert).filter(Expert.user_id == current_user.id).first()
    if not expert:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an expert account")

    if "bio" in payload:
        expert.bio = payload["bio"]
    if "consultation_fee" in payload:
        expert.consultation_fee = payload["consultation_fee"]
    if "specialization" in payload:
        expert.specialization = payload["specialization"]

    db.commit()
    return {"message": "Profile updated successfully"}


# ---------------------------------------------------------------------------
# Rule-based AI Chat — POST /ai-chat  (no paid APIs)
# ---------------------------------------------------------------------------

_AI_RULES: list[tuple[list[str], str, str, list[str]]] = [
    (
        ["career", "job", "resume", "interview", "promotion", "salary", "work", "hire", "fired", "boss", "office", "freelance", "startup", "business"],
        "career",
        "💼 Career ke baare mein soch rahe ho? Great! Here's what I recommend:\n\n"
        "1. **Resume ko tailor karo** — Har job ke liye resume customize karo. Generic resumes ignore ho jaate hain.\n"
        "2. **STAR method seekho** interviews ke liye — Situation, Task, Action, Result.\n"
        "3. **Network like crazy** — 70% jobs networking se milti hain, application se nahi.\n"
        "4. **Skills upgrade karo** — Coursera ya YouTube par free courses lo.\n"
        "5. **90-day goals set karo** — Short sprints se focus aur motivation bana rehta hai.\n\n"
        "Remember: Career ek marathon hai, sprint nahi. Har setback ek naye comeback ki tayari hai! 🚀",
        ["Interview kaise clear kare", "Salary negotiation tips", "Personal brand banao", "Career switch kaise kare"],
    ),
    (
        ["health", "fitness", "diet", "exercise", "sleep", "stress", "mental", "anxiety", "depression", "yoga", "gym", "weight", "nutrition", "sick", "doctor", "headache", "pain", "tired", "energy"],
        "health",
        "🏥 Health is wealth, yaar! Here are some solid tips:\n\n"
        "1. **Subah sabse pehle pani piyo** — Coffee se pehle hydration zaroori hai.\n"
        "2. **Roz 30 min move karo** — Walking bhi count hoti hai! Anxiety 40% kam hoti hai.\n"
        "3. **7-9 ghante ki neend lo** — Poor sleep se brain over time shrink hota hai.\n"
        "4. **Healthy khao** — Colorful plates matlab diverse nutrients.\n"
        "5. **Deep breathing karo** — 4 sec inhale, 4 sec hold, 4 sec exhale. Instant calm milega.\n\n"
        "Pro tip: Chhoti daily habits hamesha intense occasional efforts se behtar hoti hain! 💪",
        ["Morning routine ideas", "Stress kaise kam kare", "Healthy diet plan", "Achhi neend ke tips"],
    ),
    (
        ["study", "exam", "learn", "school", "college", "education", "homework", "grade", "test", "assignment", "university", "research", "thesis", "lecture", "math", "science", "engineering"],
        "study",
        "📖 Chalo padhai ko level up karte hain! Science-backed strategies:\n\n"
        "1. **Active Recall** — Book band karo aur khud ko test karo. Ye re-reading se 3x zyada effective hai.\n"
        "2. **Spaced Repetition** — Increasing intervals par review karo (1 day, 3 days, 7 days).\n"
        "3. **Pomodoro Technique** — 25 min deep focus + 5 min break. 4 rounds ke baad 30 min ka break lo.\n"
        "4. **Feynman Technique** — Kisi 5 saal ke bachhe ko samjhao. Agar nahi samjha paye, matlab concept clear nahi hai.\n"
        "5. **Environment matter karta hai** — Padhai ke liye ek dedicated space rakho.\n\n"
        "Remember: Samajhna hamesha ratne se behtar hai. Hamesha 'kyu' aur 'kaise' poocho. 🧠",
        ["Procrastination kaise chhode", "Exams me top kaise kare", "Tez padhne ke tips", "Best note-taking method"],
    ),
    (
        ["relationship", "love", "friend", "family", "dating", "breakup", "marriage", "conflict", "trust", "loneliness", "social"],
        "relationships",
        "❤️ Relationships sabse important hain. Here's some wisdom:\n\n"
        "1. **Dhyan se suno** — Phone side rakho aur logon ki baat sach me suno. Ye #1 relationship skill hai.\n"
        "2. **Boundaries set karo** — 'No' bolna selfish nahi, self-respect hai.\n"
        "3. **Quality > quantity** — 3 gehre dost 300 acquaintances se behtar hote hain.\n"
        "4. **Feelings communicate karo** — 'You always...' ki jagah 'I feel...' use karo.\n"
        "5. **Present raho** — Sabse bada gift jo aap kisi ko de sakte ho, wo hai aapka poora attention.\n\n"
        "Har relationship ek aaina hai jo humein grow karne me madad karta hai. 🌱",
        ["Communication skills badhaye", "Trust kaise build kare", "Conflict kaise handle kare", "Naye dost banaye"],
    ),
    (
        ["money", "finance", "invest", "save", "budget", "debt", "loan", "tax", "stock", "crypto", "bank", "income", "expense", "rich", "wealth"],
        "finance",
        "💰 Chalo smart money management ki baat karte hain:\n\n"
        "1. **50/30/20 Rule** — 50% zaroorat, 30% shauk, 20% savings. Yahan se shuru karo.\n"
        "2. **Emergency fund pehle** — Investing se pehle 3-6 mahine ke expenses save karo.\n"
        "3. **Lifestyle inflation avoid karo** — Income badhe to savings bhi badhni chahiye.\n"
        "4. **Jaldi invest karna shuru karo** — Compound interest duniya ka 8th wonder hai.\n"
        "5. **Kharcha track karo** — Awareness aayegi tabhi control aayega.\n\n"
        "Remember: Baat ye nahi ki aap kitna kamate ho, baat ye hai ki aap kitna bachaate ho! 📊",
        ["Budgeting basics", "Beginners ke liye investment", "Debt jaldi clear kare", "Side income ideas"],
    ),
    (
        ["productive", "productivity", "time", "focus", "distraction", "procrastination", "habit", "routine", "goal", "discipline", "organize", "planning", "schedule"],
        "productivity",
        "⚡ Let's supercharge your productivity:\n\n"
        "1. **Eat the Frog** — do your hardest task first thing in the morning.\n"
        "2. **2-Minute Rule** — if it takes less than 2 minutes, do it now.\n"
        "3. **Time blocking** — assign every hour a purpose. Unstructured time gets wasted.\n"
        "4. **Batch similar tasks** — context switching kills 40% of your productive time.\n"
        "5. **Digital detox** — phone on silent, notifications off during deep work.\n\n"
        "The secret: productive people don't have more time — they have better systems! 🎯",
        ["Build morning routines", "Beat procrastination", "Deep work techniques", "Goal setting framework"],
    ),
    (
        ["motivation", "inspire", "purpose", "dream", "success", "failure", "confidence", "self-esteem", "believe", "passion", "ambition", "give up", "hopeless", "struggle"],
        "motivation",
        "🔥 I believe in you. Here's some real talk:\n\n"
        "1. **Start before you're ready** — perfection is the enemy of progress.\n"
        "2. **Fail forward** — every failure teaches what success can't. Edison failed 10,000 times.\n"
        "3. **Compare to yesterday's you** — not someone else's highlight reel.\n"
        "4. **Action creates motivation** — not the other way around. Just start.\n"
        "5. **Celebrate small wins** — they compound into massive achievements.\n\n"
        "\"The best time to start was yesterday. The second best time is now.\" — Chinese Proverb 🌟",
        ["Overcome self-doubt", "Build discipline", "Find your purpose", "Stay consistent"],
    ),
    (
        ["technology", "tech", "code", "programming", "software", "app", "computer", "ai", "artificial intelligence", "data", "web", "python", "javascript", "machine learning"],
        "technology",
        "💻 Tech is shaping the future! Here's what matters:\n\n"
        "1. **Learn problem-solving** — the language doesn't matter, the thinking does.\n"
        "2. **Build projects** — 1 project > 10 tutorials. Get your hands dirty.\n"
        "3. **AI is your co-pilot** — learn to work WITH AI, not be replaced by it.\n"
        "4. **Stay curious** — tech changes fast. Follow key blogs, YouTube channels, and communities.\n"
        "5. **Open source** — contribute to open source projects. It's the best portfolio.\n\n"
        "The best developers are lifelong learners. Keep building! 🛠️",
        ["Start coding today", "AI tools to learn", "Best programming language", "Build your first app"],
    ),
    (
        ["cook", "recipe", "food", "meal", "kitchen", "baking", "restaurant", "dinner", "lunch", "breakfast", "snack", "vegetarian", "vegan"],
        "cooking",
        "👨‍🍳 Cooking is a superpower! Quick tips:\n\n"
        "1. **Master 5 recipes** — that's all you need to eat well forever.\n"
        "2. **Prep on Sundays** — batch cook grains, chop veggies, make sauces.\n"
        "3. **Season boldly** — salt, acid, fat, heat. Master these 4 elements.\n"
        "4. **Simple = delicious** — fresh ingredients need minimal cooking.\n"
        "5. **Learn one cuisine** — Italian, Indian, or Thai. Depth beats breadth.\n\n"
        "Home cooking saves money, builds skills, and impresses people! 🍳",
        ["Easy meal ideas", "Budget cooking tips", "Healthy quick meals", "Beginner recipes"],
    ),
    (
        ["creative", "creativity", "art", "design", "write", "writing", "music", "paint", "draw", "photography", "content", "blog", "youtube", "social media"],
        "creativity",
        "🎨 Creativity is a muscle — here's how to train it:\n\n"
        "1. **Create daily** — even 15 minutes. Consistency beats inspiration.\n"
        "2. **Steal like an artist** — study what you admire, then make it your own.\n"
        "3. **Embrace bad work** — your first 100 attempts will be rough. That's normal.\n"
        "4. **Cross-pollinate** — mix ideas from different fields for originality.\n"
        "5. **Share your work** — feedback accelerates growth faster than anything.\n\n"
        "Every expert was once a beginner. Start creating today! ✨",
        ["Start a creative habit", "Content creation tips", "Overcome creative block", "Find your style"],
    ),
    (
        ["travel", "vacation", "trip", "holiday", "flight", "hotel", "explore", "tourist", "destination", "country", "city"],
        "travel",
        "✈️ Travel broadens the mind! Here are my top travel hacks:\n\n"
        "1. **Pack light** — take half the clothes and twice the money you think you need.\n"
        "2. **Learn basic phrases** — \"hello\" and \"thank you\" in the local language go a long way.\n"
        "3. **Eat local** — skip the tourist traps and eat where the locals eat.\n"
        "4. **Wake up early** — you'll beat the crowds and see the city wake up.\n"
        "5. **Backup your documents** — keep digital copies of your passport and ID.\n\n"
        "The world is a book, and those who do not travel read only one page! 🌍",
        ["Budget travel tips", "Packing essentials", "Best destinations", "Solo travel advice"],
    ),
    (
        ["language", "fluent", "speak", "translate", "spanish", "french", "english", "grammar", "vocabulary", "accent"],
        "language",
        "🗣️ Learning a new language is incredibly rewarding:\n\n"
        "1. **Immersion is key** — change your phone language, watch movies with subtitles.\n"
        "2. **Speak from day one** — don't wait until you're 'ready'. Make mistakes!\n"
        "3. **Consistency over volume** — 15 minutes every day is better than 2 hours once a week.\n"
        "4. **Learn the top 1000 words** — they make up 80% of daily conversation.\n"
        "5. **Use flashcards** — Anki or Quizlet are great for spaced repetition.\n\n"
        "A new language is a new life! 🌟",
        ["Best language apps", "Overcome speaking fear", "Improve pronunciation", "Learn vocabulary fast"],
    ),
    (
        ["movie", "film", "cinema", "tv show", "netflix", "series", "watch", "entertainment", "actor", "director"],
        "entertainment",
        "🍿 Let's talk entertainment! When watching movies or shows:\n\n"
        "1. **Broaden your horizons** — try a highly-rated foreign film with subtitles.\n"
        "2. **Analyze the craft** — pay attention to lighting, soundtrack, and camera angles.\n"
        "3. **Watch with intent** — put the phone away and fully immerse yourself in the story.\n"
        "4. **Create a watchlist** — keep track of recommendations from friends.\n"
        "5. **Discuss it** — the best part of a great movie is talking about it afterward.\n\n"
        "Cinema is empathy. What's on your watchlist tonight? 🎬",
        ["Classic movie recommendations", "Sci-Fi masterpieces", "Best documentaries", "Binge-worthy shows"],
    ),
    (
        ["mindfulness", "meditation", "zen", "peace", "calm", "breathe", "spirituality", "gratitude", "journaling", "reflection"],
        "mindfulness",
        "🧘 Finding peace in a busy world is a superpower:\n\n"
        "1. **Start with 5 minutes** — sit quietly and just focus on your breath. When the mind wanders, gently bring it back.\n"
        "2. **Keep a gratitude journal** — write down 3 things you're thankful for every night.\n"
        "3. **Digital sunset** — turn off screens 1 hour before bed to let your mind wind down.\n"
        "4. **Mindful eating** — eat slowly without distractions, savoring every bite.\n"
        "5. **Let go of control** — focus only on what you can influence; accept the rest.\n\n"
        "Peace isn't a destination; it's a practice. 🌿",
        ["Beginner meditation", "Start journaling", "Breathing exercises", "Find daily calm"],
    ),
]


def _rule_based_reply(message: str) -> AIChatResponse:
    """Match the message against keyword rules and return a structured reply."""
    msg_lower = message.lower().strip()

    # Greetings
    greet_words = ["hi", "hello", "hey", "sup", "yo", "hola", "good morning", "good evening", "good afternoon", "what's up", "howdy"]
    if any(msg_lower.startswith(w) or msg_lower == w for w in greet_words):
        return AIChatResponse(
            category="greeting",
            reply=(
                "Hey there! 👋 Great to see you!\n\n"
                "I'm your AI assistant — think of me as a smart friend who knows about:\n\n"
                "📚 Study & Education\n"
                "💼 Career & Jobs\n"
                "🏥 Health & Fitness\n"
                "💰 Finance & Money\n"
                "⚡ Productivity\n"
                "🔥 Motivation\n"
                "💻 Technology\n"
                "❤️ Relationships\n"
                "🎨 Creativity\n"
                "👨‍🍳 Cooking\n\n"
                "Just ask me anything — I love a good conversation!"
            ),
            suggestions=["Give me career advice", "Help me study better", "I need motivation", "Health tips please"],
        )

    # Thank you
    if any(w in msg_lower for w in ["thank", "thanks", "thx", "appreciate"]):
        return AIChatResponse(
            category="general",
            reply="You're welcome! 😊 That's what I'm here for. Feel free to ask me anything else — I genuinely enjoy helping!",
            suggestions=["Ask about another topic", "Get more tips", "Tell me a fun fact"],
        )

    # How are you / about the AI
    if any(w in msg_lower for w in ["how are you", "who are you", "what are you", "your name", "about you"]):
        return AIChatResponse(
            category="general",
            reply=(
                "I'm your Saarthi Consultancy AI assistant! 🤖✨\n\n"
                "I don't get tired, I don't judge, and I'm always here to help.\n"
                "I know a lot about career, health, studies, productivity, finance, relationships, tech, and more.\n\n"
                "I'm not a replacement for our amazing human experts though — "
                "for professional medical or legal advice, always book a consultation with a verified expert on our platform!"
            ),
            suggestions=["Show me what you know", "Give me random advice", "Book a consultation"],
        )

    # Fun / joke
    if any(w in msg_lower for w in ["joke", "funny", "laugh", "humor", "fun fact", "bored"]):
        import random
        jokes = [
            "Why do programmers prefer dark mode? Because light attracts bugs! 🐛😄",
            "A doctor tells a patient: 'I have good news and bad news.' Patient: 'Good news first.' Doctor: 'You have 24 hours to live.' Patient: 'That's the GOOD news?!' Doctor: 'The bad news is I should have told you yesterday.' 😅",
            "Why did the student eat his homework? Because his teacher told him it was a piece of cake! 🍰",
            "What's the best thing about Switzerland? I don't know, but the flag is a big plus! 🇨🇭",
            "Why don't scientists trust atoms? Because they make up everything! ⚛️",
        ]
        return AIChatResponse(
            category="fun",
            reply=random.choice(jokes) + "\n\nWant to hear another one, or shall we get productive? 😄",
            suggestions=["Another joke!", "Actually, help me study", "Give me motivation", "Career advice"],
        )

    # Match against topic rules
    for keywords, category, reply, suggestions in _AI_RULES:
        if any(kw in msg_lower for kw in keywords):
            return AIChatResponse(category=category, reply=reply, suggestions=suggestions)

    # Smart fallback — try to give useful context instead of being useless
    word_count = len(msg_lower.split())
    if word_count <= 2:
        return AIChatResponse(
            category="general",
            reply=(
                f"Hmm, \"{message}\" — tell me a bit more! 🤔\n\n"
                "The more context you give me, the better I can help. Try something like:\n\n"
                "• \"How can I prepare for a job interview?\"\n"
                "• \"I'm stressed about my exams\"\n"
                "• \"Tips for eating healthier\"\n"
                "• \"How to stay motivated when things are hard\"\n\n"
                "I'm pretty good at giving advice on career, health, studies, productivity, and much more!"
            ),
            suggestions=["I need career advice", "Help me with health", "Study tips", "Motivate me"],
        )

    return AIChatResponse(
        category="general",
        reply=(
            f"Interesting question! 🧠 While I may not have a specific category for that, here's my take:\n\n"
            f"Based on what you said — \"{message[:80]}{'...' if len(message) > 80 else ''}\"\n\n"
            "My advice: Break your challenge into small, actionable steps. "
            "Most problems feel overwhelming until you write them down and tackle them one by one.\n\n"
            "If this is about something specific, try mentioning a topic like:\n"
            "career, health, study, money, productivity, motivation, tech, relationships, cooking, or creativity!\n\n"
            "Or better yet — **book a consultation** with one of our verified experts for personalized guidance! 🎯"
        ),
        suggestions=["Book a consultation", "Career advice", "Health tips", "Study techniques", "I need motivation"],
    )


@router.post("/ai-chat", response_model=AIChatResponse, tags=["ai"])
def ai_chat(
    payload: AIChatRequest,
    current_user: User = Depends(get_current_user),
) -> AIChatResponse:
    """
    Rule-based AI chat.
    Requires JWT auth AND ai_access=True on the user model.
    """
    if not current_user.ai_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Upgrade required — AI access is not enabled for your account.",
        )

    return _rule_based_reply(payload.message)


@router.post("/unlock-ai", tags=["ai"])
def unlock_ai(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Mock unlock: grants AI access to the current user."""
    current_user.ai_access = True
    db.commit()
    return {"message": "AI access unlocked successfully"}


# Admin Routes

@router.get("/admin/dashboard-stats", tags=["admin"])
def admin_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    from sqlalchemy import func
    total_users = db.query(func.count(User.id)).filter(User.role == UserRole.user).scalar() or 0
    total_experts = db.query(func.count(Expert.id)).scalar() or 0
    total_bookings = db.query(func.count(Booking.id)).scalar() or 0
    total_revenue = db.query(func.sum(Payment.amount)).filter(Payment.status == "paid").scalar() or 0
    return {
        "total_users": total_users,
        "total_experts": total_experts,
        "total_bookings": total_bookings,
        "total_revenue": total_revenue
    }

@router.get("/admin/pending-experts", tags=["admin"])
def admin_pending_experts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    experts = db.query(Expert).filter(Expert.is_verified == False).all()
    res = []
    for exp in experts:
        res.append({
            "id": exp.id,
            "name": exp.user.name,
            "email": exp.user.email,
            "category": exp.category,
            "specialization": exp.specialization,
            "experience_years": exp.experience_years,
            "bio": exp.bio,
            "consultation_fee": float(exp.consultation_fee),
        })
    return res

@router.post("/admin/approve-expert", tags=["admin"])
def admin_approve_expert(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    expert_id = payload.get("expert_id")
    expert = db.query(Expert).filter(Expert.id == expert_id).first()
    if not expert:
        raise HTTPException(status_code=404, detail="Expert not found")
    expert.is_verified = True
    db.commit()
    return {"message": "Expert approved"}

@router.get("/admin/bookings", response_model=list[AdminBookingResponse], tags=["admin"])
def admin_get_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AdminBookingResponse]:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Needs joined loads for efficiency but let's query all bookings
    bookings = db.query(Booking).order_by(Booking.booking_time.desc()).all()
    res = []
    for b in bookings:
        res.append(AdminBookingResponse(
            id=b.id,
            user_name=b.user.name,
            expert_name=b.expert.user.name,
            booking_time=b.booking_time,
            status=str(b.status.value) if hasattr(b.status, "value") else str(b.status),
            reason=b.reason,
            meeting_type=b.meeting_type,
            amount=b.expert.consultation_fee,
        ))
    return res


# Profile Routes

@router.get("/profile", tags=["profile"])
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    res = {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value if hasattr(current_user.role, "value") else current_user.role,
    }
    if current_user.role == UserRole.expert:
        expert = db.query(Expert).filter(Expert.user_id == current_user.id).first()
        if expert:
            res.update({
                "category": expert.category,
                "specialization": expert.specialization,
                "experience_years": expert.experience_years,
                "bio": expert.bio,
                "consultation_fee": float(expert.consultation_fee),
            })
    return res

@router.put("/profile/user", tags=["profile"])
def update_user_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    current_user.name = payload.name
    current_user.email = payload.email
    db.commit()
    return {"message": "Profile updated successfully"}

@router.put("/profile/expert", tags=["profile"])
def update_expert_profile(
    payload: ExpertProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    if current_user.role != UserRole.expert:
        raise HTTPException(status_code=403, detail="Not an expert")
    current_user.name = payload.name
    current_user.email = payload.email
    
    expert = db.query(Expert).filter(Expert.user_id == current_user.id).first()
    if expert:
        expert.category = payload.category
        expert.specialization = payload.specialization
        expert.experience_years = payload.experience_years
        expert.bio = payload.bio
        expert.consultation_fee = payload.consultation_fee
    
    db.commit()
    return {"message": "Expert profile updated successfully"}
