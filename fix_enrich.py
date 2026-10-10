import re

with open('src/app/(pages)/(private)/processos/processosClient.jsx', 'r') as f:
    content = f.read()

old_enrich = """  const enrichProcess = (process) =>
    process && {
      ...process,
      cliente: clientNames.has(process.cliente_id) 
        ? clientNames.get(process.cliente_id) 
        : process.cliente,
      responsavel: employeeNames.has(process.responsavel_id) 
        ? employeeNames.get(process.responsavel_id) 
        : process.responsavel,
    };"""

new_enrich = """  const enrichProcess = (process) =>
    process && {
      ...process,
      cliente: clientNames.get(process.cliente_id) ?? (process.cliente_id ? `Cliente #${process.cliente_id}` : 'Sem cliente'),
      responsavel: process.funcionario_id
        ? (employeeNames.get(process.funcionario_id) ?? `Responsável #${process.funcionario_id}`)
        : 'Sem responsável',
    };"""

content = content.replace(old_enrich, new_enrich)

with open('src/app/(pages)/(private)/processos/processosClient.jsx', 'w') as f:
    f.write(content)
