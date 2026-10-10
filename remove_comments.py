import re
import sys

def remove_comments(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    for line in lines:
        # Full line comment
        if re.match(r'^\s*//', line):
            continue
        # Inline comment
        if '//' in line and not "'" in line.split('//')[0] and not '"' in line.split('//')[0]:
            line = line.split('//')[0].rstrip() + '\n'
        elif '//' in line:
            # simple check: if the text after // doesn't contain string close
            # Let's just hardcode the specific lines we saw to avoid breaking stuff
            pass
        
        new_lines.append(line)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

for arg in sys.argv[1:]:
    remove_comments(arg)
