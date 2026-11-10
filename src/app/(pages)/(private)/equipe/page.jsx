import { cookies } from 'next/headers';
import EquipeClient from './equipeClient';
import { listarCargos } from '@/services/cargos';
import { listarFuncionarios } from '@/services/funcionarios';
import { toTeamMember } from '@/utils/funcionario';

export default async function EquipePage() {
  let token;
  try {
    const cookieStore = await cookies();
    token = cookieStore.get('access_token')?.value;
  } catch {}

  const [funcionarios, cargos] = await Promise.all([
    listarFuncionarios({ token }),
    listarCargos({ token }),
  ]);
  const teamMembersData = funcionarios.map(toTeamMember);

  return <EquipeClient initialData={teamMembersData} initialRoles={cargos} />;
}
