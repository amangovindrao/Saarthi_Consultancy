from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class ExpertRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    category: str
    specialization: str
    consultation_fee: float


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class ExpertBase(BaseModel):
    id: int
    category: str
    specialization: str | None
    experience_years: int
    bio: str | None
    consultation_fee: float
    rating: float


class ExpertResponse(ExpertBase):
    name: str


class ExpertListResponse(BaseModel):
    experts: list[ExpertResponse]


class BookingCreate(BaseModel):
    expert_id: int
    booking_time: datetime
    reason: str | None = None
    meeting_type: str = "online"
    notes: str | None = None
    urgency: str | None = "normal"
    preferred_language: str | None = "english"
    payment_method: str | None = None


class BookingResponse(BaseModel):
    id: int
    expert_id: int
    booking_time: datetime
    status: str
    reason: str | None = None
    meeting_type: str = "online"
    notes: str | None = None
    urgency: str | None = None
    preferred_language: str | None = None
    payment_method: str | None = None


class PaymentCreate(BaseModel):
    booking_id: int
    amount: float


class PaymentVerify(BaseModel):
    booking_id: int
    order_id: str
    payment_id: str


class ReviewCreate(BaseModel):
    booking_id: int
    rating: int  # 1 to 5
    comment: str | None = None


class AIQuery(BaseModel):
    user_query: str
    conversation_context: list[dict] | None = None


class AIResponse(BaseModel):
    response: str
    action: str | None = None
    data: dict | None = None
    suggestions: list[str] | None = None


# ---------------------------------------------------------------------------
# New AI Chat schemas (rule-based, no paid APIs)
# ---------------------------------------------------------------------------


class AIChatRequest(BaseModel):
    message: str


class AIChatResponse(BaseModel):
    category: str
    reply: str
    suggestions: list[str]


class MessageCreate(BaseModel):
    booking_id: int
    content: str


class MessageResponse(BaseModel):
    id: int
    booking_id: int
    sender_id: int
    sender_name: str
    content: str
    sent_at: datetime


class UserProfileUpdate(BaseModel):
    name: str
    email: str


class ExpertProfileUpdate(BaseModel):
    name: str
    email: str
    category: str
    specialization: str | None = None
    experience_years: int
    bio: str | None = None
    consultation_fee: float


class AdminBookingResponse(BaseModel):
    id: int
    user_name: str
    expert_name: str
    booking_time: datetime
    status: str
    reason: str | None = None
    meeting_type: str = "online"
    amount: float

