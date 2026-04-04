import { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Entity } from '../types';
import { useAuth } from './AuthContext';

interface EntitiesContextValue {
  entities: Entity[];
  loading: boolean;
}

const EntitiesContext = createContext<EntitiesContextValue>({ entities: [], loading: true });

export function EntitiesProvider({ children }: { children: React.ReactNode }) {
  const { orgId } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setEntities([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'entities'), where('orgId', '==', orgId));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Entity);
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      setEntities(list);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [orgId]);

  return (
    <EntitiesContext.Provider value={{ entities, loading }}>
      {children}
    </EntitiesContext.Provider>
  );
}

export function useEntities() {
  return useContext(EntitiesContext);
}
