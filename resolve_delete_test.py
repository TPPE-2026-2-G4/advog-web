import re

with open('src/components/features/processos/DeleteProcessModal/DeleteProcessModal.test.jsx', 'r') as f:
    content = f.read()

content = re.sub(r'<<<<<<< HEAD.*?=======\n(.*?)\n>>>>>>> main', r'\1', content, flags=re.DOTALL)

with open('src/components/features/processos/DeleteProcessModal/DeleteProcessModal.test.jsx', 'w') as f:
    f.write(content)
