// sw.js — Service Worker nhận thông báo đẩy (push) cho trang Gia Phả Dòng Họ Mà
// File này PHẢI đặt ở thư mục gốc của website (cùng cấp với index.html).

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Dòng Họ Mà', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Thông báo Dòng Họ Mà';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/#hieu-hy' },
  };
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // cập nhật huy hiệu số trên icon app (iPhone đã cài ra Màn hình chính, máy tính đã cài app)
      // đếm theo số thông báo đẩy đang hiện (chưa được người dùng mở xem)
      self.registration.getNotifications().then((list) => {
        try {
          if ('setAppBadge' in self.navigator) self.navigator.setAppBadge(list.length + 1);
        } catch (e) { /* thiết bị không hỗ trợ, bỏ qua */ }
      }),
    ])
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/#hieu-hy';
  event.waitUntil(
    Promise.all([
      clients.matchAll({ type: 'window' }).then((list) => {
        for (const client of list) {
          if ('focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(url);
      }),
      // còn thông báo nào chưa mở thì giữ số, hết thì xóa huy hiệu
      self.registration.getNotifications().then((list) => {
        try {
          if ('setAppBadge' in self.navigator) {
            if (list.length > 0) self.navigator.setAppBadge(list.length); else self.navigator.clearAppBadge();
          }
        } catch (e) { /* bỏ qua */ }
      }),
    ])
  );
});
