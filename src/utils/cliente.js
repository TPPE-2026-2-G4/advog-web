export const ETAPAS = [
  { id: 1, label: 'Novo contato', variant: 'novoContato' },
  { id: 2, label: 'Atendimento iniciado', variant: 'atendimentoIniciado' },
  { id: 3, label: 'Em negociação', variant: 'emNegociacao' },
  { id: 4, label: 'Cliente ativo', variant: 'clienteAtivo' },
  { id: 5, label: 'Encerrado', variant: 'encerrado' },
];

export function obterEtapaPorId(id) {
  const etapaNum = Number(id);
  return (
    ETAPAS.find((e) => e.id === etapaNum) || {
      id: etapaNum || 1,
      label: 'Novo contato',
      variant: 'novoContato',
    }
  );
}

export function obterEtapaPorLabel(label) {
  if (!label) return ETAPAS[0];
  const encontrada = ETAPAS.find(
    (e) => e.label.toLowerCase() === String(label).toLowerCase()
  );
  return (
    encontrada || {
      id: 1,
      label: String(label),
      variant: 'novoContato',
    }
  );
}

export function formatarCpfCnpj(valor) {
  if (!valor) return '';
  const digits = String(valor).replace(/\D/g, '');

  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  }

  // CNPJ: 00.000.000/0000-00
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
    .slice(0, 18);
}

export function formatarTelefone(valor) {
  if (!valor) return '';
  const digits = String(valor).replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 2) {
    return digits.length > 0 ? `(${digits}` : '';
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    // Fixo: (00) 0000-0000
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  // Celular: (00) 00000-0000
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatarDataInteracao(dataStr) {
  if (!dataStr) return '-';

  const data = new Date(dataStr);
  if (Number.isNaN(data.getTime())) return String(dataStr);

  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();

  return `${dia}/${mes}/${ano}`;
}

export function obterIniciais(nome) {
  if (!nome || typeof nome !== 'string') return '--';
  const partes = nome.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) return '--';
  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }

  const primeira = partes[0][0];
  const ultima = partes[partes.length - 1][0];
  return (primeira + ultima).toUpperCase();
}
