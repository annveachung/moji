import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/components/coming-soon';

export default function ReviewScreen() {
  const { t } = useTranslation();
  return <ComingSoon title={t('nav.review')} icon="sync" description={t('placeholder.review')} />;
}
