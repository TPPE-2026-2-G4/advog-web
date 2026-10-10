import re

with open('src/app/(pages)/(private)/processos/processosClient.test.jsx', 'r') as f:
    content = f.read()

content = re.sub(r'<<<<<<< HEAD.*?=======\n(.*?)\n>>>>>>> main', r'\1', content, flags=re.DOTALL)

with open('src/app/(pages)/(private)/processos/processosClient.test.jsx', 'w') as f:
    f.write(content)
