export const DIAS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
export const NOMES_DIAS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

export function opcoesRecorrencia(data) {
  const dia = new Date(`${data}T12:00:00`);
  const numero = dia.getDate();
  const semana = DIAS[dia.getDay()];
  const ultimo = new Date(dia.getFullYear(), dia.getMonth() + 1, 0).getDate();
  const posicao = numero + 7 > ultimo ? -1 : Math.ceil(numero / 7);
  const ordinal =
    posicao === -1
      ? 'última'
      : ['primeira', 'segunda', 'terceira', 'quarta'][posicao - 1];
  return [
    { value: 'daily', label: 'Diariamente', rule: 'FREQ=DAILY' },
    {
      value: 'weekly',
      label: `Semanalmente: ${NOMES_DIAS[dia.getDay()]}`,
      rule: `FREQ=WEEKLY;BYDAY=${semana}`,
    },
    {
      value: 'monthlyDay',
      label:
        numero === ultimo
          ? 'Mensalmente: no último dia do mês'
          : `Mensalmente: no dia ${numero}`,
      rule: `FREQ=MONTHLY;BYMONTHDAY=${numero === ultimo ? -1 : numero}`,
    },
    {
      value: 'monthlyWeekday',
      label: `Mensalmente: na ${ordinal} ${NOMES_DIAS[dia.getDay()]}`,
      rule: `FREQ=MONTHLY;BYDAY=${semana};BYSETPOS=${posicao}`,
    },
    {
      value: 'yearly',
      label: `Anualmente em ${dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
      rule: `FREQ=YEARLY;BYMONTH=${dia.getMonth() + 1};BYMONTHDAY=${numero}`,
    },
    {
      value: 'weekdays',
      label: 'Todos os dias da semana (segunda a sexta-feira)',
      rule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    },
  ];
}

export function montarRegra(
  { unidade, intervalo, dias, mensal, termina, fim, quantidade },
  data
) {
  let regra = `FREQ=${unidade};INTERVAL=${intervalo}`;
  if (unidade === 'WEEKLY') regra += `;BYDAY=${dias.join(',')}`;
  if (unidade === 'MONTHLY') {
    const opcoes = opcoesRecorrencia(data);
    regra += `;${opcoes
      .find((o) => o.value === mensal)
      .rule.split(';')
      .slice(1)
      .join(';')}`;
  }
  if (termina === 'date') regra += `;UNTIL=${fim.replaceAll('-', '')}T235959`;
  if (termina === 'count') regra += `;COUNT=${quantidade}`;
  return regra;
}
