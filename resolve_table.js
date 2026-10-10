const fs = require('fs');

let content = fs.readFileSync(
  'src/components/features/processos/ProcessTable/ProcessTable.jsx',
  'utf8'
);

content = content.replace(
  /<<<<<<< HEAD\nimport {\n  PROCESS_PAGE_SIZE,\n  formatProcessDate,\n  isOverdueDeadline,\n} from '@\/utils\/processo';\n=======\nimport { formatProcessDate, isOverdueDeadline } from '@\/utils\/processo';\n>>>>>>> main/,
  `import {
  PROCESS_PAGE_SIZE,
  formatProcessDate,
  isOverdueDeadline,
} from '@/utils/processo';`
);

content = content.replace(
  /<<<<<<< HEAD\n=======\n  if \(status === 'Arquivado'\) return styles\.statusArchived;\n>>>>>>> main/,
  `  if (status === 'Arquivado') return styles.statusArchived;`
);

content = content.replace(
  /<<<<<<< HEAD\n  pageSize = PROCESS_PAGE_SIZE,\n  hasActiveFilters = false,\n=======\n>>>>>>> main/,
  `  pageSize = PROCESS_PAGE_SIZE,
  hasActiveFilters = false,`
);

content = content.replace(
  /<<<<<<< HEAD\n}\) {\n  const firstItem = totalItems === 0 \? 0 : \(currentPage - 1\) \* pageSize \+ 1;\n  const lastItem = Math.min\(currentPage \* pageSize, totalItems\);\n=======\n  canEdit = false,\n  canDelete = false,\n}\) {\n  const firstItem = totalItems === 0 \? 0 : \(currentPage - 1\) \* 5 \+ 1;\n  const lastItem = Math.min\(currentPage \* 5, totalItems\);\n>>>>>>> main/,
  `  canEdit = false,
  canDelete = false,
}) {
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);`
);

content = content.replace(
  /<<<<<<< HEAD\n          \{hasActiveFilters \? \(\n            <>\n              <h2>Nenhum processo encontrado<\/h2>\n              <p>Ajuste os filtros para ver outros resultados.<\/p>\n            <\/>\n          \) : \(\n            <>\n              <h2>Nenhum processo cadastrado<\/h2>\n              <p>Cadastre o primeiro processo para começar a gerenciá-lo.<\/p>\n            <\/>\n          \)}\n=======\n          <h2>Nenhum processo cadastrado<\/h2>\n          <p>Cadastre o primeiro processo para começar a gerenciá-lo.<\/p>\n>>>>>>> main/,
  `          {hasActiveFilters ? (
            <>
              <h2>Nenhum processo encontrado</h2>
              <p>Ajuste os filtros para ver outros resultados.</p>
            </>
          ) : (
            <>
              <h2>Nenhum processo cadastrado</h2>
              <p>Cadastre o primeiro processo para começar a gerenciá-lo.</p>
            </>
          )}`
);

content = content.replace(
  /<<<<<<< HEAD\n                <tr key={processo\.id} className={styles\.tr}>\n                  <td className={styles\.td} data-label="Nº do Processo">\n                    <span className={styles\.processNumber}>{processo\.id}<\/span>\n=======\n                <tr key={processo\.processo_id} className={styles\.tr}>\n                  <td className={styles\.td} data-label="Nº do Processo">\n                    <span className={styles\.processNumber}>{processo\.cnj}<\/span>\n>>>>>>> main/,
  `                <tr key={processo.processo_id} className={styles.tr}>
                  <td className={styles.td} data-label="Nº do Processo">
                    <span className={styles.processNumber}>{processo.cnj}</span>`
);

content = content.replace(
  /<<<<<<< HEAD\n                        isOverdueDeadline\(processo\.prazo\)\n=======\n                        isOverdueDeadline\(processo\.data_prazo\)\n>>>>>>> main/,
  `                        isOverdueDeadline(processo.data_prazo)`
);

content = content.replace(
  /<<<<<<< HEAD\n                      {formatProcessDate\(processo\.prazo\)}\n=======\n                      {formatProcessDate\(processo\.data_prazo\)}\n>>>>>>> main/,
  `                      {formatProcessDate(processo.data_prazo)}`
);

content = content.replace(
  /<<<<<<< HEAD\n                        aria-label={`Visualizar processo \${processo\.id}`}\n=======\n                        aria-label={`Visualizar processo \${processo\.cnj}`}\n>>>>>>> main/,
  `                        aria-label={\`Visualizar processo \${processo.cnj}\`}`
);

content = content.replace(
  /<<<<<<< HEAD\n                      <button\n                        type="button"\n                        className={styles\.actionButton}\n                        onClick={\(\) => onEdit\(processo\)}\n                        aria-label={`Editar processo \${processo\.id}`}\n                        title="Editar processo"\n                      >\n                        <Pencil size={18} aria-hidden="true" \/>\n                      <\/button>\n                      <button\n                        type="button"\n                        className={`\${styles\.actionButton} \${styles\.deleteButton}`}\n                        onClick={\(\) => onDelete\(processo\)}\n                        aria-label={`Excluir processo \${processo\.id}`}\n                        title="Excluir processo"\n                      >\n                        <Trash2 size={18} aria-hidden="true" \/>\n                      <\/button>\n=======\n                      \{canEdit && \(\n                        <button\n                          type="button"\n                          className={styles\.actionButton}\n                          onClick={\(\) => onEdit\(processo\)}\n                          aria-label={`Editar processo \${processo\.cnj}`}\n                          title="Editar processo"\n                        >\n                          <Pencil size={18} aria-hidden="true" \/>\n                        <\/button>\n                      \)}\n                      \{canDelete && \(\n                        <button\n                          type="button"\n                          className={`\${styles\.actionButton} \${styles\.deleteButton}`}\n                          onClick={\(\) => onDelete\(processo\)}\n                          aria-label={`Excluir processo \${processo\.cnj}`}\n                          title="Excluir processo"\n                        >\n                          <Trash2 size={18} aria-hidden="true" \/>\n                        <\/button>\n                      \)}\n>>>>>>> main/,
  `                      {canEdit && (
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() => onEdit(processo)}
                          aria-label={\`Editar processo \${processo.cnj}\`}
                          title="Editar processo"
                        >
                          <Pencil size={18} aria-hidden="true" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          className={\`\${styles.actionButton} \${styles.deleteButton}\`}
                          onClick={() => onDelete(processo)}
                          aria-label={\`Excluir processo \${processo.cnj}\`}
                          title="Excluir processo"
                        >
                          <Trash2 size={18} aria-hidden="true" />
                        </button>
                      )}`
);

fs.writeFileSync(
  'src/components/features/processos/ProcessTable/ProcessTable.jsx',
  content
);
