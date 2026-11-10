'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  CircleCheck,
  Camera,
  LockKeyhole,
  Mail,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  atualizarPerfilFuncionario,
  uploadFotoPerfilFuncionario,
} from '@/services/funcionarios';
import LoadingDots from '@/components/ui/LoadingDots/LoadingDots';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/utils/authSession';
import { getImageUrl } from '@/utils/institucional';
import { formatOab, getLawyerInitials } from '@/utils/funcionario';
import styles from './perfil.module.css';

const emptySubscribe = () => () => {};

const getName = (user) => user?.nome || user?.nome_func || '';
const getEmail = (user) => user?.email || user?.email_func || '';
const getRole = (user) =>
  typeof user?.cargo === 'string'
    ? user.cargo
    : user?.cargo?.nome_cargo || user?.cargo?.nome || user?.nome_cargo || '';

const getProfileFields = (user) => ({
  nome: getName(user),
  ufOab: user?.uf_oab || '',
  numeroOab: user?.numero_oab || '',
  atuacaoId: user?.atuacao_id ? String(user.atuacao_id) : '',
});

export default function PerfilClient({ atuacoes = [] }) {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const currentUser = useMemo(
    () => (mounted ? user || getCurrentUser() : null),
    [mounted, user]
  );
  const [formData, setFormData] = useState(null);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoSelection, setPhotoSelection] = useState(null);
  const photoInputRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);
  const errorId = useId();
  const successId = useId();

  const profileData = formData || getProfileFields(currentUser);

  useEffect(() => {
    if (mounted && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, mounted, router]);

  useEffect(
    () => () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    },
    []
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...getProfileFields(currentUser),
      ...current,
      [name]: value,
    }));
  };

  const clearPasswordFields = () => {
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmarSenha('');
  };

  const showSuccess = (message) => {
    setErro('');
    setSucesso(message);
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => setSucesso(''), 4000);
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const isImageType = ['image/jpeg', 'image/png'].includes(file.type);
    const hasImageExtension = /\.(jpe?g|png)$/i.test(file.name);
    if (!isImageType && !hasImageExtension) {
      setErro('Formato inválido. Selecione uma imagem JPG ou PNG.');
      setSucesso('');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErro('A imagem excede o limite máximo de 5 MB.');
      setSucesso('');
      return;
    }

    setErro('');
    setSucesso('');
    setPhotoSelection({
      file,
      previewUrl: URL.createObjectURL(file),
    });
  };

  useEffect(
    () => () => {
      if (photoSelection?.previewUrl) {
        URL.revokeObjectURL(photoSelection.previewUrl);
      }
    },
    [photoSelection]
  );

  const handleCancel = () => {
    setFormData(getProfileFields(currentUser));
    clearPasswordFields();
    setPhotoSelection(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
    setErro('');
    setSucesso('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting || !currentUser) return;

    setErro('');
    setSucesso('');

    if (!profileData.nome.trim()) {
      setErro('Informe seu nome completo.');
      return;
    }

    const temOab = Boolean(profileData.ufOab || profileData.numeroOab);
    if (
      temOab &&
      (!/^[A-Za-z]{2}$/.test(profileData.ufOab) ||
        !/^\d{5}$/.test(profileData.numeroOab))
    ) {
      setErro('Informe a UF e os 5 dígitos da sua OAB.');
      return;
    }

    const querAlterarSenha = Boolean(senhaAtual || novaSenha || confirmarSenha);
    if (
      querAlterarSenha &&
      (!senhaAtual || novaSenha.length < 8 || !confirmarSenha)
    ) {
      setErro(
        'Para alterar a senha, informe a senha atual e uma nova senha com no mínimo 8 caracteres.'
      );
      return;
    }
    if (querAlterarSenha && novaSenha !== confirmarSenha) {
      setErro('A nova senha e a confirmação não conferem.');
      return;
    }

    setIsSubmitting(true);
    try {
      const dados = {
        nome: profileData.nome.trim(),
        uf_oab: profileData.ufOab ? profileData.ufOab.toUpperCase() : null,
        numero_oab: profileData.numeroOab || null,
        atuacao_id: profileData.atuacaoId
          ? Number(profileData.atuacaoId)
          : null,
      };
      if (querAlterarSenha) {
        dados.senha_atual = senhaAtual;
        dados.nova_senha = novaSenha;
        dados.confirmar_nova_senha = confirmarSenha;
      }

      const funcionarioAtualizado = await atualizarPerfilFuncionario(dados);
      let updatedUser = { ...currentUser, ...funcionarioAtualizado };

      if (photoSelection) {
        updateUser(updatedUser);
        const uploadedProfile = await uploadFotoPerfilFuncionario(
          photoSelection.file
        );
        updatedUser = { ...updatedUser, ...uploadedProfile };
      }

      updateUser(updatedUser);
      setFormData(getProfileFields(updatedUser));
      clearPasswordFields();
      setPhotoSelection(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      showSuccess('Suas informações foram atualizadas com sucesso!');
    } catch (saveError) {
      setErro(
        saveError instanceof Error
          ? saveError.message
          : 'Não foi possível atualizar seu perfil.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  if (!currentUser) {
    return null;
  }

  const selectedArea = atuacoes.find(
    (area) => String(area.atuacao_id) === profileData.atuacaoId
  );
  const areaName = selectedArea?.nome || 'Área não informada';
  const initials =
    getLawyerInitials(getName(currentUser)) ||
    getName(currentUser).slice(0, 2).toUpperCase() ||
    'U';
  const role = getRole(currentUser) || 'Não informado';
  const status = currentUser.status || 'Não informado';
  const profileImage =
    photoSelection?.previewUrl || getImageUrl(currentUser.foto_perfil_url);

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>Meu Perfil</h1>
        <p className={styles.subtitle}>
          Visualize e edite suas informações pessoais
        </p>
      </header>

      <form className={styles.profileLayout} onSubmit={handleSubmit}>
        <div
          className={styles.summaryCard}
          role="complementary"
          aria-label="Resumo do perfil"
        >
          <button
            type="button"
            className={styles.avatarButton}
            onClick={() => photoInputRef.current?.click()}
            aria-label="Alterar foto de perfil"
            disabled={isSubmitting}
          >
            <span className={styles.avatar}>
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={`Foto de ${getName(currentUser)}`}
                />
              ) : (
                initials
              )}
            </span>
          </button>
          <input
            ref={photoInputRef}
            className={styles.photoInput}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handlePhotoChange}
            aria-label="Selecionar foto de perfil"
          />
          <button
            type="button"
            className={styles.photoChangeButton}
            onClick={() => photoInputRef.current?.click()}
            disabled={isSubmitting}
          >
            <Camera size={15} aria-hidden="true" />
            {photoSelection
              ? 'Foto selecionada (salve alterações)'
              : 'Clique para alterar sua foto'}
          </button>

          <div className={styles.summaryDivider} />

          <div className={styles.summaryStatus}>
            <ShieldCheck size={18} aria-hidden="true" />
            <div>
              <span className={styles.summaryLabel}>Nível de acesso</span>
              <span className={styles.roleBadge}>{role}</span>
            </div>
          </div>

          <div className={styles.summaryStatus}>
            <CircleCheck size={18} aria-hidden="true" />
            <div>
              <span className={styles.summaryLabel}>Status</span>
              <span
                className={`${styles.statusBadge} ${
                  status === 'Ativo' ? styles.activeBadge : ''
                }`}
              >
                {status}
              </span>
            </div>
          </div>

          <div className={styles.summaryDivider} />

          <ul className={styles.summaryDetails}>
            <li>
              <Mail size={17} aria-hidden="true" />
              <span>{getEmail(currentUser) || 'E-mail não informado'}</span>
            </li>
            <li>
              <BookOpen size={17} aria-hidden="true" />
              <span>{formatOab(currentUser) || 'OAB não informada'}</span>
            </li>
            <li>
              <Scale size={17} aria-hidden="true" />
              <span>{areaName}</span>
            </li>
          </ul>
        </div>

        <div className={styles.formColumn}>
          <section className={styles.formCard} aria-labelledby="personal-title">
            <h2 id="personal-title" className={styles.sectionTitle}>
              Informações Pessoais
            </h2>

            <div className={styles.fieldsGrid}>
              <div className={`${styles.field} ${styles.fullWidth}`}>
                <label htmlFor="profile-name">Nome completo</label>
                <input
                  id="profile-name"
                  name="nome"
                  autoComplete="name"
                  value={profileData.nome}
                  onChange={handleChange}
                  required
                  maxLength={150}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="profile-email">E-mail</label>
                <input
                  id="profile-email"
                  type="email"
                  value={getEmail(currentUser)}
                  disabled
                  aria-describedby="profile-email-hint"
                />
                <span id="profile-email-hint" className={styles.fieldHint}>
                  O e-mail é definido no cadastro e não pode ser alterado aqui.
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="profile-area">Área de atuação</label>
                <select
                  id="profile-area"
                  name="atuacaoId"
                  value={profileData.atuacaoId}
                  onChange={handleChange}
                  aria-describedby="profile-area-hint"
                >
                  <option value="">Selecione uma área</option>
                  {atuacoes.map((area) => (
                    <option key={area.atuacao_id} value={area.atuacao_id}>
                      {area.nome}
                    </option>
                  ))}
                </select>
                <span id="profile-area-hint" className={styles.fieldHint}>
                  Selecione uma área cadastrada pelo administrador.
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="profile-oab-state">UF da OAB</label>
                <select
                  id="profile-oab-state"
                  name="ufOab"
                  value={profileData.ufOab}
                  onChange={handleChange}
                >
                  <option value="">Não informada</option>
                  {[
                    'AC',
                    'AL',
                    'AP',
                    'AM',
                    'BA',
                    'CE',
                    'DF',
                    'ES',
                    'GO',
                    'MA',
                    'MT',
                    'MS',
                    'MG',
                    'PA',
                    'PB',
                    'PR',
                    'PE',
                    'PI',
                    'RJ',
                    'RN',
                    'RS',
                    'RO',
                    'RR',
                    'SC',
                    'SP',
                    'SE',
                    'TO',
                  ].map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="profile-oab-number">Número OAB</label>
                <input
                  id="profile-oab-number"
                  name="numeroOab"
                  inputMode="numeric"
                  pattern="\d{5}"
                  maxLength={5}
                  value={profileData.numeroOab}
                  onChange={handleChange}
                  aria-describedby="profile-oab-hint"
                />
              </div>
            </div>
          </section>

          <section className={styles.formCard} aria-labelledby="security-title">
            <h2 id="security-title" className={styles.sectionTitle}>
              Segurança
            </h2>

            <div className={styles.fieldsGrid}>
              <div className={`${styles.field} ${styles.fullWidth}`}>
                <label htmlFor="current-password">Senha atual</label>
                <input
                  id="current-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={senhaAtual}
                  onChange={(event) => setSenhaAtual(event.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="new-password">Nova senha</label>
                <input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={8}
                  value={novaSenha}
                  onChange={(event) => setNovaSenha(event.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="confirm-password">Confirmar nova senha</label>
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmarSenha}
                  onChange={(event) => setConfirmarSenha(event.target.value)}
                />
              </div>
            </div>
            <p className={styles.passwordHint}>
              <LockKeyhole size={15} aria-hidden="true" />
              Mínimo de 8 caracteres. Use letras, números e símbolos.
            </p>
          </section>

          {(erro || sucesso) && (
            <div
              id={erro ? errorId : successId}
              className={erro ? styles.alertError : styles.alertSuccess}
              role={erro ? 'alert' : 'status'}
            >
              {erro ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              <span>{erro || sucesso}</span>
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  Salvando
                  <LoadingDots />
                </>
              ) : (
                'Salvar alterações'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
