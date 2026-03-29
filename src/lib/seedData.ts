import { collection, doc, setDoc, Timestamp, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { ENTITIES, CATEGORIES, OPENING_DATE } from './utils';

export async function seedEntities(): Promise<void> {
  const entitiesRef = collection(db, 'entities');
  const snapshot = await getDocs(entitiesRef);

  if (!snapshot.empty) {
    console.log('Entities already seeded, skipping...');
    return;
  }

  const openingTimestamp = Timestamp.fromDate(OPENING_DATE);

  for (const entity of ENTITIES) {
    const docRef = doc(entitiesRef);
    await setDoc(docRef, {
      id: docRef.id,
      name: entity.name,
      bank: entity.bank,
      openingBalance: entity.openingBalance,
      openingDate: openingTimestamp,
      order: entity.order,
    });
  }
  console.log('Entities seeded successfully');
}

export async function seedCategories(): Promise<void> {
  const categoriesRef = collection(db, 'categories');
  const snapshot = await getDocs(categoriesRef);

  if (!snapshot.empty) {
    console.log('Categories already seeded, skipping...');
    return;
  }

  for (let i = 0; i < CATEGORIES.length; i++) {
    const docRef = doc(categoriesRef);
    await setDoc(docRef, {
      id: docRef.id,
      name: CATEGORIES[i],
      order: i + 1,
    });
  }
  console.log('Categories seeded successfully');
}

export async function seedSampleTransactions(): Promise<void> {
  const transactionsRef = collection(db, 'transactions');
  const snapshot = await getDocs(transactionsRef);

  if (!snapshot.empty) {
    console.log('Transactions already exist, skipping sample data...');
    return;
  }

  const sampleTransactions = [
    {
      date: new Date(2026, 2, 7), // March 7
      entityName: 'Kishan Enterprise | ICICI',
      description: 'Sales collection from client A',
      category: 'Sales Receipt',
      credit: 150000,
      debit: null,
    },
    {
      date: new Date(2026, 2, 7),
      entityName: 'Kishan Enterprise | ICICI',
      description: 'Supplier payment',
      category: 'Purchase Payment',
      credit: null,
      debit: 75000,
    },
    {
      date: new Date(2026, 2, 8),
      entityName: 'Yaksh Carting | HDFC',
      description: 'Diesel expense',
      category: 'Diesel',
      credit: null,
      debit: 12000,
    },
    {
      date: new Date(2026, 2, 8),
      entityName: 'Shree Developer | HDFC',
      description: 'Property sale receipt',
      category: 'Sales Receipt',
      credit: 500000,
      debit: null,
    },
    {
      date: new Date(2026, 2, 9),
      entityName: 'Fremi Carting | Saraswat Bank',
      description: 'Driver salary',
      category: 'Driver',
      credit: null,
      debit: 18000,
    },
    {
      date: new Date(2026, 2, 10),
      entityName: 'Shree Developer | Saraswat Bank',
      description: 'Bank charges',
      category: 'Bank Charges',
      credit: null,
      debit: 500,
    },
    {
      date: new Date(2026, 2, 10),
      entityName: 'Shree Developer | Varachha Bank',
      description: 'Rental income',
      category: 'Rent',
      credit: 45000,
      debit: null,
    },
  ];

  for (const txn of sampleTransactions) {
    const docRef = doc(transactionsRef);
    await setDoc(docRef, {
      id: docRef.id,
      date: Timestamp.fromDate(txn.date),
      entityName: txn.entityName,
      description: txn.description,
      category: txn.category,
      credit: txn.credit,
      debit: txn.debit,
      createdBy: 'system',
      createdAt: Timestamp.now(),
      updatedBy: null,
      updatedAt: null,
    });
  }
  console.log('Sample transactions seeded successfully');
}

export async function runSeedData(): Promise<void> {
  try {
    await seedEntities();
    await seedCategories();
    await seedSampleTransactions();
    console.log('All seed data initialized successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
}
