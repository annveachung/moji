import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/components/coming-soon';

export default function ExploreScreen() {
  const { t } = useTranslation();
  return <ComingSoon title={t('nav.explore')} icon="explore" description={t('placeholder.explore')} />;
}
