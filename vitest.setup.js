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

process.env.NEXT_PUBLIC_MINIO_INTERNAL = 'minio:9000';
process.env.NEXT_PUBLIC_MINIO_EXTERNAL = 'localhost:9000';
process.env.NEXT_PUBLIC_MINIO_ALIAS = 'http://minio/';
process.env.NEXT_PUBLIC_MINIO_ALIAS_EXTERNAL = 'http://localhost:9000/';
