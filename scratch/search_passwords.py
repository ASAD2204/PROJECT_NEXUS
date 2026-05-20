import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

root_dir = r"c:\mydata\PROJECT_NEXUS-Asad_node - Copy\PROJECT_NEXUS-Asad_node"

found = []
for root, dirs, files in os.walk(root_dir):
    # Exclude node_modules and .git
    if "node_modules" in root or ".git" in root:
        continue
    for file in files:
        if file.endswith(('.md', '.json', '.txt')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'password' in content.lower() or 'admin@nexus.edu' in content:
                        found.append((path, [line for line in content.split('\n') if any(x in line.lower() for x in ['password', 'credential', 'login', 'email'])]))
            except Exception as e:
                pass

print("Files and matching lines:")
for path, lines in found:
    print(f"\nFile: {path}")
    for line in lines[:10]: # Print first 10 matching lines
        print(f"  {line.strip()}")
