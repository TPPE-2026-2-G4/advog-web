import SiteClient from './siteClient';
import { buscarDadosInstitucionais } from '@/services/institucional';

export default async function SitePage() {
  const dadosInstitucionais = await buscarDadosInstitucionais();

  return <SiteClient initialData={dadosInstitucionais} />;
}
