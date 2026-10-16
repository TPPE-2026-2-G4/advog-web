import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

// Node >= 25 expõe um localStorage global experimental que sobrepõe o do jsdom
// e fica indefinido sem --localstorage-file. Restaura os storages do jsdom.
for (const nome of ['localStorage', 'sessionStorage']) {
  const storage = globalThis.jsdom?.window?.[nome];
  if (storage) {
    Object.defineProperty(globalThis, nome, {
      value: storage,
      configurable: true,
      writable: true,
    });
  }
}
