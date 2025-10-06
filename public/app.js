// 註冊 Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(() => console.log("SW 註冊成功"));
}

const statusEl = document.getElementById("status");
const notifyBtn = document.getElementById("notifyBtn");
const refreshBtn = document.getElementById("refreshBtn");

function updatePermissionStatus() {
  const perm = Notification.permission;
  if (perm === 'granted') { statusEl.textContent = '✅ 通知已允許'; notifyBtn.style.display='none'; }
  else if (perm === 'denied') { statusEl.textContent = '🚫 通知被拒絕'; notifyBtn.style.display='none'; }
  else { statusEl.textContent = '📭 尚未授權通知'; notifyBtn.style.display='inline-block'; }
}

async function enableNotifications() {
  const perm = await Notification.requestPermission();
  updatePermissionStatus();
  if (perm !== 'granted') return;

  const res = await fetch('/vapidPublicKey');
  const data = await res.json();
  const reg = await navigator.serviceWorker.ready;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.key)
  });

  await fetch('/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub)
  });
  alert('通知已啟用 ✅');
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(c=>c.charCodeAt(0)));
}

notifyBtn.addEventListener('click', enableNotifications);
refreshBtn.addEventListener('click', () => window.location.reload());
updatePermissionStatus();
