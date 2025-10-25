import React from 'react';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function HeaderLanguageSwitcher() {
  return (
    <div className="fixed top-4 right-4 z-50">
      <LanguageSwitcher />
    </div>
  );
}

export const layout = {
  areaId: 'header',
  sortOrder: 10
};
