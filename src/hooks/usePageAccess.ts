import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/contexts/AuthContext';

export type PageKey =
  | 'dashboard'
  | 'agendamentos'
  | 'clientes'
  | 'pacotes'
  | 'valores'
  | 'moderacao'
  | 'configuracoes'
  | 'servicos';

export interface PageAccessEntry {
  role: string;
  page_key: string;
  allowed: boolean;
}

export const PAGE_LABELS: Record<PageKey, string> = {
  dashboard: 'Dashboard Admin',
  agendamentos: 'Agendamentos',
  clientes: 'Clientes',
  pacotes: 'Pacotes',
  valores: 'Valores',
  moderacao: 'Galeria e Avaliações',
  configuracoes: 'Configurações',
  servicos: 'Serviços',
};

const DEFAULT_ACCESS: Record<string, Record<string, boolean>> = {
  admin: {
    dashboard: true, agendamentos: true, clientes: true, pacotes: true,
    valores: true, moderacao: true, configuracoes: true, servicos: false,
  },
  midia: {
    dashboard: false, agendamentos: false, clientes: false, pacotes: false,
    valores: false, moderacao: true, configuracoes: false, servicos: false,
  },
};

export function usePageAccess() {
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>(DEFAULT_ACCESS);
  const [loaded, setLoaded] = useState(false);

  const fetchMatrix = useCallback(async () => {
    const { data } = await supabase
      .from('page_access_matrix')
      .select('role, page_key, allowed');
    
    if (data && data.length > 0) {
      const built: Record<string, Record<string, boolean>> = {};
      data.forEach((row: any) => {
        if (!built[row.role]) built[row.role] = {};
        built[row.role][row.page_key] = row.allowed;
      });

      // Ensure we have at least the defaults if they are missing from DB
      const final = { ...DEFAULT_ACCESS };
      Object.keys(built).forEach(role => {
        final[role] = { ...(DEFAULT_ACCESS[role] || {}), ...built[role] };
      });

      setMatrix(final);
    }
    setLoaded(true);
  }, []);

  // Fetch from DB
  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  const toggleAccess = useCallback(async (role: string, page: PageKey) => {
    const newValue = !matrix[role]?.[page];
    setMatrix(prev => ({
      ...prev,
      [role]: { ...prev[role], [page]: newValue },
    }));

    // Upsert in DB
    await supabase
      .from('page_access_matrix')
      .upsert(
        { role: role as any, page_key: page, allowed: newValue },
        { onConflict: 'role,page_key' }
      );
  }, [matrix]);

  const addRole = useCallback(async (newRoleName: string) => {
    const role = newRoleName.toLowerCase().trim();
    if (!role || matrix[role]) return false;

    // Initialize with all false
    const initialPages: Record<string, boolean> = {};
    Object.keys(PAGE_LABELS).forEach(p => initialPages[p] = false);

    setMatrix(prev => ({ ...prev, [role]: initialPages }));

    // Prepare batch upsert
    const entries = Object.keys(PAGE_LABELS).map(p => ({
      role: role,
      page_key: p,
      allowed: false
    }));

    await supabase.from('page_access_matrix').upsert(entries);
    return true;
  }, [matrix]);

  const removeRole = useCallback(async (role: string) => {
    if (role === 'admin' || role === 'midia') return; // Protective
    
    setMatrix(prev => {
      const next = { ...prev };
      delete next[role];
      return next;
    });

    await supabase.from('page_access_matrix').delete().eq('role', role);
  }, []);

  const canAccess = useCallback((role: AppRole | string, page: PageKey): boolean => {
    if (role === 'dev') return true;
    if (role === 'cliente') return false;
    return matrix[role]?.[page] ?? false;
  }, [matrix]);

  const resetToDefaults = useCallback(async () => {
    // Delete custom roles from DB? Or just reset standard ones?
    // User probably wants to clear all and back to defaults.
    await supabase.from('page_access_matrix').delete().neq('id', 'placeholder'); // Simple way to clear table
    setMatrix(DEFAULT_ACCESS);
    
    const entries: any[] = [];
    for (const [role, pages] of Object.entries(DEFAULT_ACCESS)) {
      for (const [page, allowed] of Object.entries(pages)) {
        entries.push({ role, page_key: page, allowed });
      }
    }
    await supabase.from('page_access_matrix').upsert(entries);
  }, []);

  return { matrix, toggleAccess, canAccess, resetToDefaults, loaded, addRole, removeRole, refresh: fetchMatrix };
}
