'use client';

import { Eye, Mail, Pencil, Phone, Trash2, Users } from 'lucide-react';
import {
  formatarCpfCnpj,
  formatarDataInteracao,
  formatarTelefone,
  obterEtapaPorId,
  obterIniciais,
} from '@/utils/cliente';
import { getImageUrl } from '@/utils/institucional';
import { getValidFotoUrl } from '@/utils/funcionario';
import styles from './ClientTable.module.css';

export default function ClientTable({
  clientes = [],
  funcionarios = [],
  onView,
  onEdit,
  onDelete,
  canManage = true,
}) {
  const getResponsavelInfo = (cliente) => {
    let nome = 'Não atribuído';
    let fotoUrl = null;

    if (cliente.responsavel_nome) nome = cliente.responsavel_nome;
    if (cliente.responsavel) {
      if (typeof cliente.responsavel === 'string') {
        nome = cliente.responsavel;
      } else if (cliente.responsavel.nome) {
        nome = cliente.responsavel.nome;
        fotoUrl = getValidFotoUrl(cliente.responsavel);
      }
    }

    if (cliente.responsavel_id) {
      const func = funcionarios.find(
        (f) =>
          Number(f.funcionario_id || f.id) === Number(cliente.responsavel_id)
      );
      if (func) {
        nome = func.nome;
        if (!fotoUrl) fotoUrl = getValidFotoUrl(func);
      }
    } else if (nome && nome !== 'Não atribuído') {
      const func = funcionarios.find((f) => f.nome === nome);
      if (func && !fotoUrl) fotoUrl = getValidFotoUrl(func);
    }

    if (!fotoUrl && cliente.responsavel_foto_url) {
      fotoUrl = getValidFotoUrl(cliente.responsavel_foto_url);
    }

    return { nome, fotoUrl };
  };

  const getResponsavelNome = (cliente) => getResponsavelInfo(cliente).nome;

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
              const responsavelInfo = getResponsavelInfo(cliente);
              const responsavelNome = responsavelInfo.nome;
              const documento =
                cliente.cpf || cliente.cnpj || cliente.documento;

              return (
                <tr
                  key={cliente.cliente_id || cliente.id}
                  className={styles.tr}
                  data-testid={`cliente-row-${cliente.cliente_id || cliente.id}`}
                >
                  <td className={styles.td} data-label="Cliente">
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

                  <td className={styles.td} data-label="Contato">
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

                  <td className={styles.td} data-label="Responsável">
                    {responsavelNome && responsavelNome !== 'Não atribuído' ? (
                      <div className={styles.responsibleCell}>
                        <div className={styles.responsibleAvatar}>
                          {responsavelInfo.fotoUrl ? (
                            <>
                              <img
                                src={getImageUrl(responsavelInfo.fotoUrl)}
                                alt={`Foto de ${responsavelNome}`}
                                className={styles.avatarImage}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextElementSibling) {
                                    e.currentTarget.nextElementSibling.style.display =
                                      'inline';
                                  }
                                }}
                              />
                              <span style={{ display: 'none' }}>
                                {obterIniciais(responsavelNome)}
                              </span>
                            </>
                          ) : (
                            obterIniciais(responsavelNome)
                          )}
                        </div>
                        <span className={styles.responsavel}>
                          {responsavelNome}
                        </span>
                      </div>
                    ) : (
                      <span className={styles.responsavel}>
                        {responsavelNome || 'Não atribuído'}
                      </span>
                    )}
                  </td>

                  <td className={styles.td} data-label="Última Interação">
                    <span className={styles.ultimaInteracao}>
                      {formatarDataInteracao(cliente.ultima_interacao)}
                    </span>
                  </td>

                  <td className={styles.td} data-label="Status">
                    <span className={`${styles.badge} ${badgeClass}`}>
                      {etapa.label}
                    </span>
                  </td>

                  <td className={styles.td} data-label="Ações">
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

                      {canManage && (
                        <>
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
                        </>
                      )}
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
