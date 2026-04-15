import json
from app.config import settings

ROUTING_MAP = {
    "wifi": "IT Department",
    "internet": "IT Department",
    "network": "IT Department",
    "computer": "IT Department",
    "cleanliness": "Estate Department",
    "broken": "Estate Department",
    "maintenance": "Estate Department",
    "harassment": "Student Affairs (URGENT)",
    "bullying": "Student Affairs (URGENT)",
    "discrimination": "Student Affairs (URGENT)",
    "grade": "Examination Department",
    "marks": "Examination Department",
    "result": "Examination Department",
    "fee": "Finance Department",
    "payment": "Finance Department",
    "scholarship": "Finance Department",
    "library": "Library Department",
    "book": "Library Department",
}


def route_grievance(description: str) -> dict:
    description_lower = description.lower()
    for keyword, dept in ROUTING_MAP.items():
        if keyword in description_lower:
            return {"department": dept, "is_urgent": "URGENT" in dept}

    if settings.GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-pro")
            prompt = f"""Classify this university complaint into one department:
            IT Department, Finance Department, Academic Department, Student Affairs, Estate Department, Library Department, Examination Department.
            Also determine if it is URGENT (yes/no).
            Complaint: {description}
            Respond ONLY in JSON: {{"department": "...", "is_urgent": true/false}}"""
            response = model.generate_content(prompt)
            return json.loads(response.text)
        except Exception:
            pass

    return {"department": "General Administration", "is_urgent": False}
