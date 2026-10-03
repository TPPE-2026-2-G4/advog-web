import SiteClient from './siteClient';
import { buscarDadosInstitucionais } from '@/services/institucional';
import { listarFuncionarios } from '@/services/funcionarios';

export default async function SitePage() {
  const [dadosInstitucionais, funcionarios] = await Promise.all([
    buscarDadosInstitucionais(),
    listarFuncionarios(),
  ]);

  return (
    <SiteClient initialData={dadosInstitucionais} initialTeam={funcionarios} />
  );
}
