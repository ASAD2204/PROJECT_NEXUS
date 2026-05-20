import re

path = r"c:\mydata\PROJECT_NEXUS-Asad_node - Copy\PROJECT_NEXUS-Asad_node\backend\services\sis-service\app\routes.py"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "@router" in line or "def " in line or "transcript" in line.lower():
        print(f"{i+1}: {line.strip()}")
