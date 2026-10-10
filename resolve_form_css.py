import re

with open('src/components/features/processos/ProcessFormModal/ProcessFormModal.module.css', 'r') as f:
    content = f.read()

# Replace all conflicts with the "main" side since it supports textarea, optional labels, etc.
content = re.sub(r'<<<<<<< HEAD.*?=======\n(.*?)\n>>>>>>> main', r'\1', content, flags=re.DOTALL)

with open('src/components/features/processos/ProcessFormModal/ProcessFormModal.module.css', 'w') as f:
    f.write(content)
