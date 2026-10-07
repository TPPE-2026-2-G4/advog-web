import { buscarDadosInstitucionais } from '@/services/institucional';
import { Scale } from 'lucide-react';
import styles from './page.module.css';

export default async function Home() {
  const dados = await buscarDadosInstitucionais();

  const sobreTextos = dados.sobreEscritorio
    ? dados.sobreEscritorio.split('\n').filter((p) => p.trim() !== '')
    : [
        'Fundado em 2010 por Dr. Alexandre Carreiro, o escritório nasceu com a missão de oferecer atendimento jurídico de excelência, combinando tradição e inovação tecnológica. Localizado em Brasília-DF, atendemos clientes em todo o território nacional.',
        'Com mais de 15 anos de experiência, nossa equipe é formada por advogados especializados que priorizam a defesa dos direitos dos nossos clientes com ética, dedicação e resultados concretos. Nosso maior diferencial é o controle rigoroso de prazos processuais, garantindo que nenhuma oportunidade seja perdida.',
      ];

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
                  src={dados.imagemSobre}
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
      </main>
    </div>
  );
}
