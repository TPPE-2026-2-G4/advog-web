import SiteClient from './siteClient';
import { buscarDadosInstitucionais } from '@/services/institucional';
import { listarFuncionarios } from '@/services/funcionarios';
import { listarAtuacoes } from '@/services/atuacoes';
import { isAdministratorAccount } from '@/utils/funcionario';

export default async function SitePage() {
  const [dadosInstitucionais, funcionarios, atuacoes] = await Promise.all([
    buscarDadosInstitucionais(),
    listarFuncionarios(),
    listarAtuacoes(),
  ]);

  return (
    <SiteClient
      initialData={dadosInstitucionais}
      initialTeam={(funcionarios || []).filter(
        (f) => !isAdministratorAccount(f)
      )}
      initialAreas={atuacoes}
    />
  );
}
