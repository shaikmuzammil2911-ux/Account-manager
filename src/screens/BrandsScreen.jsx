import React from 'react';
import OttBrandsGrid from '../components/OttBrandsGrid';

export default function BrandsScreen({
  brands = [],
  selectedBrand,
  onSelectBrand,
  onNavigate
}) {
  return (
    <OttBrandsGrid
      brands={brands}
      onSelectBrand={(brand) => {
        onSelectBrand(brand);
        onNavigate('inventory');
      }}
      onBack={() => onNavigate('home')}
      activeTab="home"
      onSelectTab={(tab) => onNavigate(tab)}
    />
  );
}
