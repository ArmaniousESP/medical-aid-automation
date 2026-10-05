'use client';

import { Suspense } from 'react';
import { UnlockPanel } from '../UnlockPanel';

/**
 * Reuses Home UnlockPanel (AdminGoogleAuth + PROCESS_SECRET + ops checklist).
 */
export function AdminPanelClient() {
  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <UnlockPanel />
      </Suspense>
    </div>
  );
}
