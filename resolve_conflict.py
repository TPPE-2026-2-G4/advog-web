import sys

def resolve(filepath, keep='ours'):
    with open(filepath, 'r') as f:
        lines = f.readlines()
        
    out = []
    state = 'normal' # normal, ours, theirs
    
    for line in lines:
        if line.startswith('<<<<<<<'):
            state = 'ours'
            continue
        elif line.startswith('======='):
            state = 'theirs'
            continue
        elif line.startswith('>>>>>>>'):
            state = 'normal'
            continue
            
        if state == 'normal':
            out.append(line)
        elif state == 'ours' and keep == 'ours':
            out.append(line)
        elif state == 'theirs' and keep == 'theirs':
            out.append(line)
            
    with open(filepath, 'w') as f:
        f.writelines(out)

resolve('src/components/features/financas/LancamentosTable/LancamentosTable.jsx', 'ours')
resolve('src/components/features/financas/LancamentosTable/LancamentosTable.test.jsx', 'ours')
resolve('src/contexts/AuthContext.jsx', 'theirs')
resolve('src/utils/authSession.js', 'theirs')
