import re

path = r"c:\mydata\PROJECT_NEXUS-Asad_node - Copy\PROJECT_NEXUS-Asad_node\backend\services\auth-service\app\routes.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's search for login or verify or password
matches = re.findall(r"(def login|verify_password|hash_password|password|hash|bcrypt)", content, re.IGNORECASE)
print("Matches in routes.py:", matches)

# Find functions with 'def' and print them
for line in content.split('\n'):
    if 'def ' in line or 'pwd_context' in line or 'crypt' in line or 'verify' in line:
        print(line.strip())
