from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
h = '$2b$12$XGeuwXg0H8zV9TCng0Lfc.XjmH/ieuSyRWVYtr8/FpVMvup4cLx7a'

passwords = [
    "password123",
    "Student@12345",
    "student@123",
    "Student@123",
    "student123",
    "Student123"
]

print("Checking hash:", h)
for p in passwords:
    try:
        res = pwd_context.verify(p, h)
        print(f"Password '{p}': {res}")
    except Exception as e:
        print(f"Error checking '{p}': {e}")
