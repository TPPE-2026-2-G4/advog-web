import re

with open('src/app/(pages)/(private)/processos/processosClient.jsx', 'r') as f:
    content = f.read()

# Add import for toResponsavelOptions
content = content.replace("import { useProcessos } from '@/hooks/useProcessos';", "import { useProcessos } from '@/hooks/useProcessos';\nimport { toResponsavelOptions } from '@/utils/processo';")

# Add responsaveisOptions useMemo
options_memo = """  const employeeNames = useMemo(
    () => new Map(funcionarios.map((item) => [item.funcionario_id, item.nome])),
    [funcionarios]
  );
  
  const responsaveisOptions = useMemo(
    () => toResponsavelOptions(funcionarios),
    [funcionarios]
  );"""
content = content.replace("  const employeeNames = useMemo(\n    () => new Map(funcionarios.map((item) => [item.funcionario_id, item.nome])),\n    [funcionarios]\n  );", options_memo)

# Update ProcessFilters prop
content = content.replace("responsaveis={responsaveis}", "responsaveis={responsaveisOptions}")

with open('src/app/(pages)/(private)/processos/processosClient.jsx', 'w') as f:
    f.write(content)
