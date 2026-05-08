import { useState, useCallback } from 'react';
import { pricingBanhos, pricingTosas, pricingCombo, pricingPackages } from '@/data/mockData';

export interface ValoresData {
  banho: { pequeno: number; medio: number; grande: number };
  tosa: { pequeno: number; medio: number; grande: number };
  combo: { pequeno: number; medio: number; grande: number };
  pacoteSemanal: { pequeno: number; medio: number; grande: number };
  pacoteQuinzenal: { pequeno: number; medio: number; grande: number };
}

export function getDefaultValores(): ValoresData {
  const quinzenal = pricingPackages.find(p => p.id === 'quinzenal');
  const semanal = pricingPackages.find(p => p.id === 'semanal');
  return {
    banho: { ...pricingBanhos[0].prices },
    tosa: { ...pricingTosas[0].prices },
    combo: { ...pricingCombo[0].prices },
    pacoteSemanal: semanal ? { ...semanal.prices } : { pequeno: 160, medio: 200, grande: 260 },
    pacoteQuinzenal: quinzenal ? { ...quinzenal.prices } : { pequeno: 90, medio: 110, grande: 140 },
  };
}

export function getSuggestedPrice(service: string, size: string): number | null {
  const valores = getDefaultValores();
  const sizeKey = normSize(size);
  if (!sizeKey) return null;

  const sLower = service.toLowerCase();
  if (sLower.includes('combo') || (sLower.includes('banho') && sLower.includes('tosa'))) return valores.combo[sizeKey];
  if (sLower.includes('tosa')) return valores.tosa[sizeKey];
  if (sLower.includes('banho')) return valores.banho[sizeKey];
  return null;
}

function normSize(size: string): 'pequeno' | 'medio' | 'grande' | null {
  const s = size.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (s.startsWith('peq') || s === 'p') return 'pequeno';
  if (s.startsWith('med') || s === 'm') return 'medio';
  if (s.startsWith('gra') || s === 'g') return 'grande';
  return null;
}

export function useValores() {
  const [valores, setValores] = useState<ValoresData>(getDefaultValores);

  const save = useCallback((data: ValoresData) => {
    setValores(data);
  }, []);

  const reset = useCallback(() => {
    const defaults = getDefaultValores();
    setValores(defaults);
    return defaults;
  }, []);

  return { valores, setValores: save, reset };
}
