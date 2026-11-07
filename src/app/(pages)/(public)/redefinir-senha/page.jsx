'use client';

import { Suspense } from 'react';
import { ForgotPasswordContent } from '../esqueci-senha/page';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordContent resetMode />
    </Suspense>
  );
}
