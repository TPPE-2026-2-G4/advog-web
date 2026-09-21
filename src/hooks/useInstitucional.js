import { useState } from 'react';
import {
  DEFAULT_INSTITUCIONAL,
  DEFAULT_EQUIPE_SITE,
  salvarDadosInstitucionais,
  uploadImagemInstitucional,
} from '@/services/institucional';
import { mudarExibicaoInstitucional } from '@/services/funcionarios';

export function useInstitucional(initialData, options = {}) {
  const [formData, setFormData] = useState(
    initialData || DEFAULT_INSTITUCIONAL
  );
  const [activeTab, setActiveTab] = useState('visual');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [logoPreview, setLogoPreview] = useState(
    initialData?.logotipo || DEFAULT_INSTITUCIONAL.logotipo
  );
  const [bannerPreview, setBannerPreview] = useState(
    initialData?.bannerHero || DEFAULT_INSTITUCIONAL.bannerHero
  );
  const [sobreImagePreview, setSobreImagePreview] = useState(
    initialData?.imagemSobre || DEFAULT_INSTITUCIONAL.imagemSobre
  );
  const [team, setTeam] = useState(
    Array.isArray(options.initialTeam)
      ? options.initialTeam
      : DEFAULT_EQUIPE_SITE
  );

  const isAdmin = options.isAdmin !== undefined ? options.isAdmin : true;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSaveSuccess(false);
    setSaveError('');
  };

  const handleUploadLogo = async (file) => {
    if (!file) return;

    setUploadError('');

    const formatosValidos = ['image/png', 'image/svg+xml'];
    if (
      !formatosValidos.includes(file.type) &&
      !file.name.match(/\.(png|svg)$/i)
    ) {
      setUploadError('Formato inválido. Selecione um arquivo PNG ou SVG.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('O arquivo excede o limite máximo de 2 MB.');
      return;
    }

    try {
      const url = await uploadImagemInstitucional(file, 'logo');
      setLogoPreview(url);
      setFormData((prev) => ({ ...prev, logotipo: url }));
    } catch (error) {
      setUploadError(error.message || 'Falha ao carregar logotipo.');
    }
  };

  const handleUploadBanner = async (file) => {
    if (!file) return;

    setUploadError('');

    const formatosValidos = ['image/jpeg', 'image/jpg', 'image/png'];
    if (
      !formatosValidos.includes(file.type) &&
      !file.name.match(/\.(jpe?g|png)$/i)
    ) {
      setUploadError('Formato inválido. Selecione um arquivo JPG ou PNG.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('O arquivo excede o limite máximo de 5 MB.');
      return;
    }

    try {
      const url = await uploadImagemInstitucional(file, 'banner');
      setBannerPreview(url);
      setFormData((prev) => ({ ...prev, bannerHero: url }));
    } catch (error) {
      setUploadError(error.message || 'Falha ao carregar imagem do banner.');
    }
  };

  const handleUploadImagemSobre = async (file) => {
    if (!file) return;

    setUploadError('');

    const formatosValidos = ['image/jpeg', 'image/jpg', 'image/png'];
    if (
      !formatosValidos.includes(file.type) &&
      !file.name.match(/\.(jpe?g|png)$/i)
    ) {
      setUploadError('Formato inválido. Selecione um arquivo JPG ou PNG.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('O arquivo excede o limite máximo de 5 MB.');
      return;
    }

    try {
      const url = await uploadImagemInstitucional(file, 'sobre');
      setSobreImagePreview(url);
      setFormData((prev) => ({ ...prev, imagemSobre: url }));
    } catch (error) {
      setUploadError(
        error.message || 'Falha ao carregar imagem da seção sobre.'
      );
    }
  };

  const handleToggleLawyerVisibility = (funcionarioId) => {
    setTeam((prevTeam) =>
      prevTeam.map((member) =>
        member.funcionario_id === funcionarioId
          ? { ...member, exibicaoInstitucional: !member.exibicaoInstitucional }
          : member
      )
    );
    setSaveSuccess(false);
    setSaveError('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const saved = await salvarDadosInstitucionais(formData);
      setFormData(saved);

      if (team && team.length > 0) {
        await Promise.allSettled(
          team.map((member) =>
            mudarExibicaoInstitucional(
              member.funcionario_id,
              Boolean(member.exibicaoInstitucional)
            )
          )
        );
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (error) {
      setSaveError(error.message || 'Erro ao salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    formData,
    activeTab,
    setActiveTab,
    isPreviewOpen,
    setIsPreviewOpen,
    isSaving,
    saveSuccess,
    saveError,
    uploadError,
    logoPreview,
    bannerPreview,
    sobreImagePreview,
    team,
    isAdmin,
    handleInputChange,
    handleUploadLogo,
    handleUploadBanner,
    handleUploadImagemSobre,
    handleToggleLawyerVisibility,
    handleSave,
  };
}
