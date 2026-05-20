import os
import re

frontend_dir = r"c:\mydata\PROJECT_NEXUS-Asad_node - Copy\PROJECT_NEXUS-Asad_node\frontend\src"

found = []
for root, dirs, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'import-history' in content or 'importHistory' in content:
                        found.append(path)
            except Exception as e:
                pass

print("Files found containing import-history/importHistory:")
for f in found:
    print(f)
