import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/components/coming-soon';

export default function LibraryScreen() {
  const { t } = useTranslation();
  return <ComingSoon title={t('nav.library')} icon="style" description={t('placeholder.library')} />;
}
