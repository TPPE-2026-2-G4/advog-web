import re

with open('src/services/processos.test.js', 'r') as f:
    content = f.read()

content = re.sub(r'<<<<<<< HEAD.*?=======\n(.*?)\n>>>>>>> main', r'\1', content, flags=re.DOTALL)

with open('src/services/processos.test.js', 'w') as f:
    f.write(content)
