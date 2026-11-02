import type { TFunction } from 'i18next';

import { ApiError } from './api';

/** A friendly sentence for why an AI request didn't work. */
export function aiErrorMessage(t: TFunction, error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return t('ai.errors.network');
    if (error.code === 'ai_not_configured') return t('ai.errors.notConfigured');
    if (error.code === 'rate_limited') return t('ai.errors.rateLimited');
  }
  return t('ai.errors.failed');
}
