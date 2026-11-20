import {
  AlarmClock,
  AlertTriangle,
  CalendarClock,
  Clock,
  FileText,
  Info,
  UserCheck,
  UserPlus,
} from 'lucide-react';

export const TIPOS_NOTIFICACAO = Object.freeze([
  'ATRIBUICAO',
  'VENCIMENTO_7D',
  'VENCIMENTO_1D',
  'VENCIMENTO_HOJE',
  'ATRASO',
  'NOVO_CLIENTE',
  'STATUS_PROCESSO',
  'SISTEMA',
]);

export const notificacoesKeys = Object.freeze({
  all: ['notificacoes'],
  contagem: () => ['notificacoes', 'contagem'],
  listas: () => ['notificacoes', 'lista'],
  lista: (filtros = {}) => ['notificacoes', 'lista', { ...filtros }],
});

export const BORDA_URGENCIA = Object.freeze({
  urgente: 'border-l-red-600',
  importante: 'border-l-orange-500',
  atencao: 'border-l-amber-500',
  info: 'border-l-primary',
});

export const ROTULO_URGENCIA = Object.freeze({
  urgente: 'Urgente',
  importante: 'Importante',
  atencao: 'Atenção',
  info: '',
});

const CONFIG = Object.freeze({
  ATRASO: {
    label: 'Em atraso',
    icone: AlertTriangle,
    urgencia: 'urgente',
    corTexto: 'text-red-600',
    corBgIcone: 'bg-red-100 dark:bg-red-950/40',
  },
  VENCIMENTO_HOJE: {
    label: 'Vence hoje',
    icone: AlarmClock,
    urgencia: 'urgente',
    corTexto: 'text-red-600',
    corBgIcone: 'bg-red-100 dark:bg-red-950/40',
  },
  VENCIMENTO_1D: {
    label: 'Vence amanhã',
    icone: Clock,
    urgencia: 'importante',
    corTexto: 'text-orange-600',
    corBgIcone: 'bg-orange-100 dark:bg-orange-950/40',
  },
  VENCIMENTO_7D: {
    label: 'Vence em 7 dias',
    icone: CalendarClock,
    urgencia: 'atencao',
    corTexto: 'text-amber-600',
    corBgIcone: 'bg-amber-100 dark:bg-amber-950/40',
  },
  ATRIBUICAO: {
    label: 'Atribuição',
    icone: UserCheck,
    urgencia: 'info',
    corTexto: 'text-emerald-600',
    corBgIcone: 'bg-emerald-100 dark:bg-emerald-950/40',
  },
  NOVO_CLIENTE: {
    label: 'Novo cliente',
    icone: UserPlus,
    urgencia: 'info',
    corTexto: 'text-sky-600',
    corBgIcone: 'bg-sky-100 dark:bg-sky-950/40',
  },
  STATUS_PROCESSO: {
    label: 'Status do processo',
    icone: FileText,
    urgencia: 'info',
    corTexto: 'text-purple-600',
    corBgIcone: 'bg-purple-100 dark:bg-purple-950/40',
  },
  SISTEMA: {
    label: 'Sistema',
    icone: Info,
    urgencia: 'info',
    corTexto: 'text-blue-600',
    corBgIcone: 'bg-blue-100 dark:bg-blue-950/40',
  },
});

export const obterConfigTipo = (tipo) => CONFIG[tipo] ?? CONFIG.SISTEMA;
