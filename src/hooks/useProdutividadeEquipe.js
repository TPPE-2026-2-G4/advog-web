import { useEffect, useState } from 'react';
import { listarProdutividadeEquipe } from '@/services/atividades';
import { formatarSumarioEquipe } from '@/utils/produtividadeEquipe';
import { isAdministratorAccount } from '@/utils/funcionario';

export function useProdutividadeEquipe(enabled = false) {
  const [productivity, setProductivity] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    const loadProductivity = async () => {
      if (!enabled) {
        setProductivity([]);
        setError('');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const received = await listarProdutividadeEquipe();
        if (ignore) return;

        setProductivity(
          (Array.isArray(received) ? received : [])
            .filter((row) => !isAdministratorAccount(row))
            .map(formatarSumarioEquipe)
        );
      } catch (receivedError) {
        if (ignore) return;

        setProductivity([]);
        setError(
          receivedError instanceof Error
            ? receivedError.message
            : 'Não foi possível carregar a produtividade da equipe.'
        );
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    loadProductivity();

    return () => {
      ignore = true;
    };
  }, [enabled]);

  return { productivity, isLoading, error };
}
