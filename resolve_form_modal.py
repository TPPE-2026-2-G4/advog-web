import re

with open('src/components/features/processos/ProcessFormModal/ProcessFormModal.jsx', 'r') as f:
    content = f.read()

# Instead of complex regexes, I will just rewrite the file fully using the components from `main` combined with `formatCnjInput`.
