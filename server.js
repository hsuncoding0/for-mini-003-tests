const express = require('express');
const bodyParser = require('body-parser');
const webpush = require('web-push');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== VAPID 金鑰永久保留 =====
const vapidPath = path.join(__dirname, 'vapid.json');
let vapidKeys;

if (fs.existsSync(vapidPath)) {
  vapidKeys = JSON.parse(fs.readFileSync(vapidPath));
}

// 如果不存在或空，生成新金鑰並存檔
if (!vapidKeys || !vapidKeys.publicKey || !vapidKeys.privateKey) {
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(vapidPath, JSON.stringify(vapidKeys));
  console.log('✅ 生成新的 VAPID 金鑰並存檔');
}

webpush.setVapidDetails(
  'mailto:test@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

let users = []; // { ip, subscription, status }

// ===== 提供公鑰給前端訂閱 =====
app.get('/vapidPublicKey', (req, res) => res.json({ key: vapidKeys.publicKey }));

// ===== Admin 取得 VAPID 金鑰 =====
app.get('/vapidKeys', (req, res) => {
  // ⚠️ 注意：私鑰只應 Admin 可見
  res.json(vapidKeys);
});

// ===== 訂閱 =====
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const existing = users.find(u => u.ip === ip);
  if (existing) {
    existing.subscription = subscription;
    existing.status = 'active';
  } else {
    users.push({ ip, subscription, status: 'active' });
  }
  res.status(201).json({});
  console.log(`✅ 新訂閱 IP: ${ip}`);
});

// ===== Admin 取得所有使用者 =====
app.get('/users', (req, res) => {
  const data = users.map(u => ({ ip: u.ip, status: u.status }));
  res.json(data);
});

// ===== 發送通知（單個或群發） =====
app.post('/sendNotification', async (req, res) => {
  const { ip, title, message, image } = req.body;
  const payload = JSON.stringify({ title, body: message, image });
  const targets = ip ? users.filter(u => u.ip === ip) : users;

  for (let u of targets) {
    try {
      await webpush.sendNotification(u.subscription, payload);
    } catch (err) {
      console.error(`❌ 發送給 ${u.ip} 失敗`, err);
      u.status = 'failed';
    }
  }

  res.json({ sentTo: targets.map(u => u.ip) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
