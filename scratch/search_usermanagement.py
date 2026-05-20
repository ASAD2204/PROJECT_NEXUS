import sys
sys.stdout.reconfigure(encoding='utf-8')

path = r"c:\mydata\PROJECT_NEXUS-Asad_node - Copy\PROJECT_NEXUS-Asad_node\frontend\src\pages\Admin\UserManagement.jsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "LegacyHistoryDialog" in line or "history" in line.lower():
        print(f"{i+1}: {line.strip()}")
