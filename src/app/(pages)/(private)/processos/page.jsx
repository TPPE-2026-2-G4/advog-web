import { listarFuncionarios } from '@/services/funcionarios';
import { listarProcessos } from '@/services/processos';
import {
  PROCESS_PAGE_SIZE,
  DEFAULT_PROCESS_PAGE,
  toProcessPage,
  toResponsavelNames,
  toResponsavelOptions,
} from '@/utils/processo';
import ProcessosClient from './processosClient';

async function getProcessosData() {
  try {
    const [page, funcionarios] = await Promise.all([
      listarProcessos({ page: 1, pageSize: PROCESS_PAGE_SIZE }),
      listarFuncionarios(),
    ]);

    const responsaveis = toResponsavelOptions(funcionarios);
    const initialPage = toProcessPage(page, toResponsavelNames(responsaveis));

    return { initialPage, responsaveis, initialError: '' };
  } catch (error) {
    return {
      initialPage: DEFAULT_PROCESS_PAGE,
      responsaveis: [],
      initialError:
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os processos.',
    };
  }
}

export default async function ProcessosPage() {
  const { initialPage, initialError, responsaveis } = await getProcessosData();

  return (
    <ProcessosClient
      initialPage={initialPage}
      initialError={initialError}
      responsaveis={responsaveis}
    />
  );
}
