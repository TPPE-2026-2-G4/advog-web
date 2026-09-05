import EquipeClient from './equipeClient';
import { listarFuncionarios } from '@/services/funcionarios';
import { toTeamMember } from '@/utils/funcionario';

export default async function EquipePage() {
  const funcionarios = await listarFuncionarios();
  const teamMembersData = funcionarios.map(toTeamMember);

  return <EquipeClient initialData={teamMembersData} />;
}
