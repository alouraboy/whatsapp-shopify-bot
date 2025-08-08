const makeWASocket = require('@whiskeysockets/baileys').default;
const { useSingleFileAuthState } = require('@whiskeysockets/baileys');
const express = require('express');
const bodyParser = require('body-parser');
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

const app = express();
app.use(bodyParser.json());

let sock;

async function startWhatsApp() {
  sock = makeWASocket({
    auth: state,
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if(connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== 401;
      if(shouldReconnect) {
        startWhatsApp();
      }
    } else if(connection === 'open') {
      console.log('WhatsApp connected');
    }
  });
}

startWhatsApp();

async function sendMessage(phone, message) {
  const number = phone.replace(/\D/g, '');
  const jid = number + '@s.whatsapp.net';
  try {
    await sock.sendMessage(jid, { text: message });
    return true;
  } catch (e) {
    console.error('Error sending message:', e);
    return false;
  }
}

app.post('/order-confirm', async (req, res) => {
  const { phone, orderId, customerName } = req.body;
  if(!phone || !orderId || !customerName) return res.status(400).send('Missing parameters');

  const msg = `✅ Hi ${customerName},\n\nThank you for your order *#${orderId}* with *Your Brand*. We’re processing it and will update you soon!`;

  const success = await sendMessage(phone, msg);
  if(success) res.send('Order confirmation sent');
  else res.status(500).send('Failed to send order confirmation');
});

app.post('/cod-confirm', async (req, res) => {
  const { phone, orderId, customerName } = req.body;
  if(!phone || !orderId || !customerName) return res.status(400).send('Missing parameters');

  const msg = `🛒 Hi ${customerName},\n\nYour order *#${orderId}* is placed with COD payment.\nPlease reply *YES* to confirm or *NO* to cancel your order.`;

  const success = await sendMessage(phone, msg);
  if(success) res.send('COD confirmation sent');
  else res.status(500).send('Failed to send COD confirmation');
});

app.post('/abandoned-cart', async (req, res) => {
  const { phone, cartId, customerName } = req.body;
  if(!phone || !cartId || !customerName) return res.status(400).send('Missing parameters');

  const msg = `⏰ Hi ${customerName},\n\nYou left some items in your cart *#${cartId}*.\nComplete your purchase now to get exciting offers!`;

  const success = await sendMessage(phone, msg);
  if(success) res.send('Abandoned cart reminder sent');
  else res.status(500).send('Failed to send abandoned cart reminder');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('WhatsApp automation bot running on port', PORT);
});
