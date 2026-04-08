import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db, ensureSignedIn, auth } from './src/firebase';

const DEMO_MENU = [
  { id: 'demo-veg-sandwich', name: 'Veg Sandwich', price: 60 },
  { id: 'demo-paneer-roll', name: 'Paneer Roll', price: 90 },
  { id: 'demo-masala-dosa', name: 'Masala Dosa', price: 80 },
  { id: 'demo-cold-coffee', name: 'Cold Coffee', price: 70 },
];

const STATUS_COLORS = {
  Placed: '#2F80ED',
  Preparing: '#F2994A',
  Ready: '#27AE60',
};

function formatCurrency(value) {
  return `₹${value}`;
}

export default function App() {
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const previousStatusByOrderRef = useRef({});

  useEffect(() => {
    let unsubMenu;
    let unsubOrders;

    async function init() {
      const user = await ensureSignedIn();

      const menuQuery = query(collection(db, 'menu'));
      unsubMenu = onSnapshot(menuQuery, (snap) => {
        const liveMenu = snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
        setMenu(liveMenu.length ? liveMenu : DEMO_MENU);
      });

      const orderQuery = query(collection(db, 'orders'), where('userId', '==', user.uid));
      unsubOrders = onSnapshot(orderQuery, (snap) => {
        const rows = snap.docs
          .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
          .sort((left, right) => {
            const leftMs = left.createdAt?.seconds ? left.createdAt.seconds * 1000 : 0;
            const rightMs = right.createdAt?.seconds ? right.createdAt.seconds * 1000 : 0;
            return rightMs - leftMs;
          });

        setOrders(rows);
        setLoading(false);
      });
    }

    init();

    return () => {
      if (unsubMenu) unsubMenu();
      if (unsubOrders) unsubOrders();
    };
  }, []);

  useEffect(() => {
    const previousStatuses = previousStatusByOrderRef.current;

    for (const order of orders) {
      const previousStatus = previousStatuses[order.id];
      if (previousStatus && previousStatus !== 'Ready' && order.status === 'Ready') {
        Alert.alert('Order Ready', `Token #${order.token} is ready for pickup.`);
      }
      previousStatuses[order.id] = order.status;
    }
  }, [orders]);

  const cartItems = useMemo(() => {
    return menu
      .filter((item) => cart[item.id])
      .map((item) => ({ ...item, quantity: cart[item.id] }));
  }, [cart, menu]);

  const totalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  function addToCart(itemId) {
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  }

  function removeFromCart(itemId) {
    setCart((prev) => {
      const nextValue = (prev[itemId] || 0) - 1;
      if (nextValue <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: nextValue };
    });
  }

  async function placeOrder() {
    if (!cartItems.length || !auth.currentUser) {
      return;
    }

    const token = String(Date.now()).slice(-5);

    await addDoc(collection(db, 'orders'), {
      userId: auth.currentUser.uid,
      token,
      items: cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount,
      status: 'Placed',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setCart({});
    Alert.alert('Order placed', `Token #${token} has been sent to kitchen.`);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2F80ED" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={menu}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>ConnectEat</Text>
            <Text style={styles.subtitle}>Order food without standing in queue</Text>
            <Text style={styles.sectionTitle}>Menu</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.menuCard}>
            <View>
              <Text style={styles.menuName}>{item.name}</Text>
              <Text style={styles.menuPrice}>{formatCurrency(item.price)}</Text>
            </View>
            <View style={styles.qtyControl}>
              <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.qtyBtn}>
                <Text>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{cart[item.id] || 0}</Text>
              <TouchableOpacity onPress={() => addToCart(item.id)} style={styles.qtyBtn}>
                <Text>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <>
            <View style={styles.cartBar}>
              <Text style={styles.cartText}>Total: {formatCurrency(totalAmount)}</Text>
              <TouchableOpacity
                style={[styles.placeButton, !cartItems.length && styles.disabledButton]}
                disabled={!cartItems.length}
                onPress={placeOrder}
              >
                <Text style={styles.placeButtonText}>Place Order</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>My Orders</Text>
            {orders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.orderToken}>Token #{order.token}</Text>
                  <Text style={[styles.status, { color: STATUS_COLORS[order.status] || '#333' }]}>
                    {order.status}
                  </Text>
                </View>
                <Text style={styles.orderItems}>
                  {(order.items || []).map((i) => `${i.name} x${i.quantity}`).join(', ')}
                </Text>
              </View>
            ))}
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7FAFF', paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '700', marginTop: 8, color: '#0A2540' },
  subtitle: { color: '#46607D', marginBottom: 14 },
  sectionTitle: { marginTop: 12, marginBottom: 8, fontWeight: '700', fontSize: 18 },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuName: { fontSize: 16, fontWeight: '600' },
  menuPrice: { color: '#496482', marginTop: 4 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#EAF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: { minWidth: 20, textAlign: 'center' },
  cartBar: {
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartText: { fontWeight: '700', fontSize: 16 },
  placeButton: {
    backgroundColor: '#2F80ED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledButton: { opacity: 0.5 },
  placeButtonText: { color: '#fff', fontWeight: '700' },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  orderToken: { fontWeight: '700' },
  status: { fontWeight: '700' },
  orderItems: { color: '#496482' },
});
