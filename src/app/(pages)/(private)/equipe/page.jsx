import EquipeClient from './equipeClient';
import { listarCargos } from '@/services/cargos';
import { listarFuncionarios } from '@/services/funcionarios';
import { toTeamMember } from '@/utils/funcionario';

export default async function EquipePage() {
  const [funcionarios, cargos] = await Promise.all([
    listarFuncionarios(),
    listarCargos(),
  ]);
  const teamMembersData = funcionarios.map(toTeamMember);

  return <EquipeClient initialData={teamMembersData} initialRoles={cargos} />;
}
