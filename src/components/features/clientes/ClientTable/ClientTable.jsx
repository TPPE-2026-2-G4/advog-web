'use client';

import { Eye, Mail, Pencil, Phone, Trash2, Users } from 'lucide-react';
import {
  formatarCpfCnpj,
  formatarDataInteracao,
  formatarTelefone,
  obterEtapaPorId,
  obterIniciais,
} from '@/utils/cliente';
import styles from './ClientTable.module.css';

export default function ClientTable({
  clientes = [],
  funcionarios = [],
  onView,
  onEdit,
  onDelete,
}) {
  const getResponsavelNome = (cliente) => {
    if (cliente.responsavel_nome) return cliente.responsavel_nome;
    if (cliente.responsavel) {
      if (typeof cliente.responsavel === 'string') return cliente.responsavel;
      if (cliente.responsavel.nome) return cliente.responsavel.nome;
    }
    if (cliente.responsavel_id) {
      const func = funcionarios.find(
        (f) =>
          Number(f.funcionario_id || f.id) === Number(cliente.responsavel_id)
      );
      if (func) return func.nome;
    }
    return 'Não atribuído';
  };

  if (!clientes || clientes.length === 0) {
    return (
      <div className={styles.tableCard}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Users size={28} />
          </div>
          <h3 className={styles.emptyTitle}>Nenhum cliente encontrado</h3>
          <p className={styles.emptyDescription}>
            Nenhum cliente corresponde aos filtros selecionados. Tente ajustar a
            busca ou adicione um novo cliente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Cliente</th>
              <th className={styles.th}>Contato</th>
              <th className={styles.th}>Responsável</th>
              <th className={styles.th}>Última Interação</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => {
              const etapa = obterEtapaPorId(
                cliente.etapa_id || cliente.status_id
              );
              const badgeClass = styles[etapa.variant] || styles.novoContato;
              const responsavelNome = getResponsavelNome(cliente);
              const documento =
                cliente.cpf || cliente.cnpj || cliente.documento;

              return (
                <tr
                  key={cliente.cliente_id || cliente.id}
                  className={styles.tr}
                  data-testid={`cliente-row-${cliente.cliente_id || cliente.id}`}
                >
                  <td className={styles.td}>
                    <div className={styles.clientCol}>
                      <div className={styles.avatar}>
                        {obterIniciais(cliente.nome)}
                      </div>
                      <div className={styles.clientInfo}>
                        <span className={styles.clientName}>
                          {cliente.nome}
                        </span>
                        {documento && (
                          <span className={styles.clientDoc}>
                            {formatarCpfCnpj(documento)}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className={styles.td}>
                    <div className={styles.contactCol}>
                      {cliente.telefone && (
                        <div className={styles.contactItem}>
                          <Phone size={14} className={styles.contactIcon} />
                          <span>{formatarTelefone(cliente.telefone)}</span>
                        </div>
                      )}
                      {cliente.email && (
                        <div className={styles.contactItem}>
                          <Mail size={14} className={styles.contactIcon} />
                          <span>{cliente.email}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className={styles.td}>
                    <span className={styles.responsavel}>
                      {responsavelNome}
                    </span>
                  </td>

                  <td className={styles.td}>
                    <span className={styles.ultimaInteracao}>
                      {formatarDataInteracao(cliente.ultima_interacao)}
                    </span>
                  </td>

                  <td className={styles.td}>
                    <span className={`${styles.badge} ${badgeClass}`}>
                      {etapa.label}
                    </span>
                  </td>

                  <td className={styles.td}>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => onView?.(cliente)}
                        title="Visualizar detalhes"
                        aria-label={`Visualizar detalhes de ${cliente.nome}`}
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => onEdit?.(cliente)}
                        title="Editar cliente"
                        aria-label={`Editar cliente ${cliente.nome}`}
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => onDelete?.(cliente)}
                        title="Excluir cliente"
                        aria-label={`Excluir cliente ${cliente.nome}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
