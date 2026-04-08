const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

exports.notifyWhenOrderReady = onDocumentUpdated('orders/{orderId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  if (!before || !after) {
    return;
  }

  if (before.status === after.status || after.status !== 'Ready') {
    return;
  }

  const userId = after.userId;
  if (!userId) {
    return;
  }

  const userRef = admin.firestore().collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return;
  }

  const { fcmToken } = userDoc.data();
  if (!fcmToken) {
    return;
  }

  await admin.messaging().send({
    token: fcmToken,
    notification: {
      title: 'Your order is ready 🍽️',
      body: `Token #${after.token || event.params.orderId.slice(0, 6)} is ready for pickup.`,
    },
    data: {
      orderId: event.params.orderId,
      status: 'Ready',
    },
  });
});
