import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db, ensureSignedIn } from './firebase';

const STATUS_FLOW = ['Placed', 'Preparing', 'Ready'];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function App() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let unsub;

    async function start() {
      try {
        await ensureSignedIn();
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'asc'));
        unsub = onSnapshot(q, (snapshot) => {
          const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
          setOrders(rows);
          setLoading(false);
        });
      } catch (err) {
        setError(err.message || 'Unable to load orders');
        setLoading(false);
      }
    }

    start();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const grouped = useMemo(() => {
    return STATUS_FLOW.reduce((acc, status) => {
      acc[status] = orders.filter((order) => order.status === status);
      return acc;
    }, {});
  }, [orders]);

  async function moveToNextStatus(orderId, currentStatus) {
    const currentIndex = STATUS_FLOW.indexOf(currentStatus);
    const next = STATUS_FLOW[currentIndex + 1];
    if (!next) return;

    await updateDoc(doc(db, 'orders', orderId), {
      status: next,
      updatedAt: serverTimestamp(),
      readyAt: next === 'Ready' ? serverTimestamp() : null,
    });
  }

  if (loading) {
    return <div className="state">Loading orders...</div>;
  }

  if (error) {
    return <div className="state error">{error}</div>;
  }

  return (
    <main className="dashboard">
      <header>
        <h1>ConnectEat Dashboard</h1>
        <p>Real-time canteen order board</p>
      </header>
      <section className="columns">
        {STATUS_FLOW.map((status) => (
          <article key={status} className="column">
            <h2>
              {status} <span>{grouped[status].length}</span>
            </h2>
            <div className="cards">
              {grouped[status].map((order) => (
                <div key={order.id} className="card">
                  <div className="card-top">
                    <strong>#{order.token || order.id.slice(0, 6)}</strong>
                    <small>{formatCurrency(order.totalAmount)}</small>
                  </div>
                  <ul>
                    {(order.items || []).map((item) => (
                      <li key={item.id || item.name}>
                        {item.name} x {item.quantity}
                      </li>
                    ))}
                  </ul>
                  {status !== 'Ready' && (
                    <button onClick={() => moveToNextStatus(order.id, order.status)}>
                      Mark as {STATUS_FLOW[STATUS_FLOW.indexOf(status) + 1]}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
