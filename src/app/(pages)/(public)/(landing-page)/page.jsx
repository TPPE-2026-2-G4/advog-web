import { buscarDadosInstitucionais } from '@/services/institucional';
import { listarAtuacoes } from '@/services/atuacoes';
import { Scale } from 'lucide-react';
import styles from './page.module.css';

import { getImageUrl, formatParagraphs } from '@/utils/institucional';

export default async function Home() {
  const [dados, atuacoes] = await Promise.all([
    buscarDadosInstitucionais(),
    listarAtuacoes(),
  ]);

  const sobreTextos = formatParagraphs(dados?.sobreEscritorio);
  const atuacoesVisiveis = (atuacoes || []).filter(
    (area) => area.exibicaoInstitucional
  );

  return (
    <div style={{ backgroundColor: '#FAF9F6', minHeight: '100vh' }}>
      <main className={styles.container}>
        <section className={styles.contentWrapper}>
          <div className={styles.textContent}>
            <h2 className={styles.title}>Sobre o Escritório</h2>
            <div className={styles.paragraphs}>
              {sobreTextos.map((paragrafo, index) => (
                <p key={index}>{paragrafo}</p>
              ))}
            </div>
          </div>

          <div className={styles.imageContainer}>
            <div className={styles.imageBox}>
              {dados.imagemSobre ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getImageUrl(dados.imagemSobre)}
                  alt="Imagem do escritório"
                  className={styles.image}
                />
              ) : (
                <>
                  <Scale className={styles.placeholderIcon} />
                  <span className={styles.placeholderText}>
                    Imagem do escritório
                  </span>
                </>
              )}
            </div>
          </div>
        </section>

        {atuacoesVisiveis.length > 0 && (
          <section className={styles.areasSection}>
            <h2 className={styles.title}>Áreas de Atuação</h2>
            <div className={styles.areasGrid}>
              {atuacoesVisiveis.map((area) => (
                <div key={area.atuacao_id} className={styles.areaCard}>
                  <h3 className={styles.areaCardTitle}>
                    {area.titulo || area.nome}
                  </h3>
                  <p className={styles.areaCardDesc}>{area.descricao}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
