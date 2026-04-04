import { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Entity } from '../types';

interface EntitiesContextValue {
  entities: Entity[];
  loading: boolean;
}

const EntitiesContext = createContext<EntitiesContextValue>({ entities: [], loading: true });

export function EntitiesProvider({ children }: { children: React.ReactNode }) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'entities'), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Entity);
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      setEntities(list);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  return (
    <EntitiesContext.Provider value={{ entities, loading }}>
      {children}
    </EntitiesContext.Provider>
  );
}

export function useEntities() {
  return useContext(EntitiesContext);
}
