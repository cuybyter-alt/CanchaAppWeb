import React, { useMemo, useState } from 'react';
import { CreditCard, Plus, ReceiptText, Trash2 } from 'lucide-react';
import notify from '../services/toast';

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  holder: string;
  expiry: string;
}

interface Transaction {
  id: string;
  title: string;
  status: 'Completado' | 'Pendiente' | 'Fallido';
  date: string;
  paymentMethod: string;
  amount: number;
}

const METHODS_KEY = 'canchapp-payment-methods';
const TX_KEY = 'canchapp-payment-transactions';

const sampleTransactions: Transaction[] = [
  {
    id: 'tx-1',
    title: 'Cancha de Fútbol 5 - Complejo Deportivo El Salitre',
    status: 'Completado',
    date: '14 de marzo de 2024',
    paymentMethod: 'Visa •••• 4242',
    amount: 28000,
  },
  {
    id: 'tx-2',
    title: 'Cancha de Fútbol 7 - El Porvenir',
    status: 'Completado',
    date: '20 de marzo de 2024',
    paymentMethod: 'Mastercard •••• 5501',
    amount: 35000,
  },
];

const readMethods = (): PaymentMethod[] => {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(METHODS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PaymentMethod[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readTransactions = (): Transaction[] => {
  if (typeof window === 'undefined') return sampleTransactions;
  const raw = localStorage.getItem(TX_KEY);
  if (!raw) {
    localStorage.setItem(TX_KEY, JSON.stringify(sampleTransactions));
    return sampleTransactions;
  }
  try {
    const parsed = JSON.parse(raw) as Transaction[];
    return Array.isArray(parsed) ? parsed : sampleTransactions;
  } catch {
    return sampleTransactions;
  }
};

const writeMethods = (methods: PaymentMethod[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(METHODS_KEY, JSON.stringify(methods));
};

const Payments: React.FC = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>(readMethods);
  const transactions = useMemo(() => readTransactions(), []);

  const [holder, setHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [brand, setBrand] = useState('Visa');

  const addMethod = () => {
    const digits = cardNumber.replace(/\D/g, '');
    if (!holder || digits.length < 12 || !expiry) {
      notify.error('Datos incompletos', 'Ingresa titular, número válido y fecha de expiración.');
      return;
    }

    const newMethod: PaymentMethod = {
      id: `pm-${Date.now()}`,
      brand,
      last4: digits.slice(-4),
      holder,
      expiry,
    };

    const updated = [newMethod, ...methods];
    setMethods(updated);
    writeMethods(updated);

    setHolder('');
    setCardNumber('');
    setExpiry('');
    setBrand('Visa');
    notify.success('Método agregado', `${newMethod.brand} •••• ${newMethod.last4} fue agregado.`);
  };

  const removeMethod = (id: string) => {
    const updated = methods.filter((m) => m.id !== id);
    setMethods(updated);
    writeMethods(updated);
    notify.success('Método eliminado', 'Se eliminó el método de pago.');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--color-text)]">Pagos</h2>
        <p className="text-sm text-[var(--color-text-3)] font-semibold mt-1">Gestiona métodos de pago y revisa tus transacciones</p>
      </div>

      <section className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[var(--color-primary)]" />
          <h3 className="text-xl font-extrabold text-[var(--color-text)]">Métodos de Pago</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            placeholder="Titular"
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
            className="h-11 px-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
          <input
            placeholder="Número de tarjeta"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            className="h-11 px-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
          <input
            placeholder="MM/AA"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="h-11 px-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="h-11 px-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            <option>Visa</option>
            <option>Mastercard</option>
            <option>American Express</option>
          </select>
        </div>

        <button
          onClick={addMethod}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-white font-extrabold hover:bg-[var(--color-primary-dark)]"
        >
          <Plus className="w-4 h-4" />
          Agregar medio de pago
        </button>

        <div className="space-y-3">
          {methods.length === 0 ? (
            <p className="text-sm text-[var(--color-text-3)] font-semibold">No tienes tarjetas registradas.</p>
          ) : (
            methods.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surf2)]">
                <div>
                  <p className="font-extrabold text-[var(--color-text)]">{m.brand} •••• {m.last4}</p>
                  <p className="text-xs font-semibold text-[var(--color-text-3)]">{m.holder} · Exp {m.expiry}</p>
                </div>
                <button
                  onClick={() => removeMethod(m.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-2)] hover:text-[var(--color-accent)]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Quitar
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="bg-[var(--color-surface)] border-[1.5px] border-[var(--color-border)] rounded-[var(--radius-2xl)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ReceiptText className="w-5 h-5 text-[var(--color-primary)]" />
          <h3 className="text-xl font-extrabold text-[var(--color-text)]">Historial de pagos</h3>
        </div>

        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="p-4 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surf2)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold text-[var(--color-text)]">{tx.title}</p>
                  <p className="text-sm font-semibold text-emerald-500 mt-1">{tx.status}</p>
                  <p className="text-xs font-semibold text-[var(--color-text-3)] mt-1">{tx.date}</p>
                  <p className="text-xs font-semibold text-[var(--color-text-3)] mt-1">{tx.paymentMethod}</p>
                </div>
                <p className="text-xl font-black text-[var(--color-primary-dark)]">${Math.round(tx.amount / 1000)}k</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Payments;
