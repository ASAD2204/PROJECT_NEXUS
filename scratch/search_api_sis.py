import sys
sys.stdout.reconfigure(encoding='utf-8')

path = r"c:\mydata\PROJECT_NEXUS-Asad_node - Copy\PROJECT_NEXUS-Asad_node\frontend\src\api\sis.js"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "import-history" in line or "importHistory" in line:
        start = max(0, i-5)
        end = min(len(lines), i+6)
        print(f"=== Match at line {i+1} ===")
        for j in range(start, end):
            print(f"{j+1}: {lines[j].strip()}")
