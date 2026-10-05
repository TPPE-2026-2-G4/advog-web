import { listarFuncionarios } from '@/services/funcionarios';
import { listarProcessos } from '@/services/processos';
import {
  PROCESS_PAGE_SIZE,
  toProcessPage,
  toResponsavelNames,
  toResponsavelOptions,
} from '@/utils/processo';
import ProcessosClient from './processosClient';

export default async function ProcessosPage() {
  let initialPage = {
    itens: [],
    total: 0,
    page: 1,
    pageSize: PROCESS_PAGE_SIZE,
    totalPages: 1,
  };
  let initialError = '';
  let responsaveis = [];

  try {
    const [page, funcionarios] = await Promise.all([
      listarProcessos({ page: 1, pageSize: PROCESS_PAGE_SIZE }),
      listarFuncionarios(),
    ]);

    responsaveis = toResponsavelOptions(funcionarios);
    initialPage = toProcessPage(page, toResponsavelNames(responsaveis));
  } catch (error) {
    initialError =
      error instanceof Error
        ? error.message
        : 'Não foi possível carregar os processos.';
  }

  return (
    <ProcessosClient
      initialPage={initialPage}
      initialError={initialError}
      responsaveis={responsaveis}
    />
  );
}
