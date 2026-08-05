import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from './AuthContext';
import { executeQuery } from '../database/database';

export interface ParentChild {
  id: number;
  full_name: string;
  email: string;
  class_id: number | null;
  class_number: number | null;
}

interface ParentChildContextType {
  children: ParentChild[];
  loading: boolean;
  selectedChildId: number | null;
  setSelectedChildId: (id: number) => void;
  selectedChild: ParentChild | null;
  refresh: () => Promise<void>;
}

const ParentChildContext = createContext<ParentChildContextType | undefined>(
  undefined
);

export const ParentChildProvider: React.FC<{ children: React.ReactNode }> = ({
  children: reactChildren,
}) => {
  const { user } = useAuth();
  const [childList, setChildList] = useState<ParentChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const rows = await executeQuery(
        `SELECT u.id, u.full_name, u.email, u.class_id, c.class_number
         FROM users u
         LEFT JOIN classes c ON u.class_id = c.id
         WHERE u.parent_id = ?
         ORDER BY u.full_name ASC`,
        [user.id]
      );
      const list = rows as ParentChild[];
      setChildList(list);
      setSelectedChildId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list.length > 0 ? list[0].id : null;
      });
    } catch (error) {
      console.error('Error loading linked children:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const selectedChild =
    childList.find((c) => c.id === selectedChildId) || null;

  return (
    <ParentChildContext.Provider
      value={{
        children: childList,
        loading,
        selectedChildId,
        setSelectedChildId,
        selectedChild,
        refresh,
      }}
    >
      {reactChildren}
    </ParentChildContext.Provider>
  );
};

export const useParentChild = (): ParentChildContextType => {
  const ctx = useContext(ParentChildContext);
  if (!ctx) {
    throw new Error('useParentChild must be used within a ParentChildProvider');
  }
  return ctx;
};
