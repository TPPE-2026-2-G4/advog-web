export const EMPTY_TEAM_SUMMARY = Object.freeze({
  finalizadas: 0,
  em_andamento: 0,
  a_fazer: 0,
  atrasadas: 0,
  progresso: 0,
});

export const formatarSumarioEquipe = (summary) => ({
  ...EMPTY_TEAM_SUMMARY,
  ...(summary || {}),
  finalizadas: Number(summary?.finalizadas || 0),
  em_andamento: Number(summary?.em_andamento || 0),
  a_fazer: Number(summary?.a_fazer || 0),
  atrasadas: Number(summary?.atrasadas || 0),
  progresso: Number(summary?.progresso || 0),
});

export const obterProgressoEquipe = (summary) => {
  return Math.max(0, Math.min(100, Number(summary.progresso || 0)));
};
