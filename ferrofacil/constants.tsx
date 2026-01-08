
import React from 'react';

// Peso por metro linear (kg/m)
export const STEEL_WEIGHTS: Record<string, number> = {
  '4.2': 0.109,
  '5.0': 0.154,
  '6.3': 0.245,
  '8.0': 0.395,
  '10.0': 0.617,
  '12.5': 0.963,
  '16.0': 1.578,
  '20.0': 2.466
};

export const GAUGES = Object.keys(STEEL_WEIGHTS);

export const DEFAULT_KG_PRICE = 12.50; // Preço médio por KG

