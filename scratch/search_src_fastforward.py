import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

src_dir = r"c:\mydata\PROJECT_NEXUS-Asad_node - Copy\PROJECT_NEXUS-Asad_node\frontend\src"

found = []
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'fastForwardStudent' in content or 'importStudentHistory' in content:
                        found.append(path)
            except Exception as e:
                pass

print("Files found in src containing fastForwardStudent or importStudentHistory:")
for f in found:
    print(f)
