import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

backend_dir = r"c:\mydata\PROJECT_NEXUS-Asad_node - Copy\PROJECT_NEXUS-Asad_node\backend"

found = []
for root, dirs, files in os.walk(backend_dir):
    for file in files:
        if file.endswith('.py'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'fast-forward' in content or 'fast_forward' in content:
                        found.append(path)
            except Exception as e:
                pass

print("Files found in backend containing fast-forward:")
for f in found:
    print(f)
