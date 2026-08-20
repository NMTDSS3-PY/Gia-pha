// /api/notify-hieu-hy.js
// Được Supabase Database Webhook gọi TỰ ĐỘNG mỗi khi có dòng mới trong bảng
// "thong_bao_hieu_hy" (xem hướng dẫn thiết lập Webhook trong HUONG_DAN_TRIEN_KHAI.md).
//
// CẦN THIẾT LẬP Environment Variables trong Vercel (Project Settings > Environment Variables):
//   SUPABASE_URL                 - vd: https://lwhgbxpwpitarmtsovvi.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    - Supabase Dashboard > Project Settings > API > service_role
//                                  (khóa bí mật — KHÔNG đưa vào file HTML)
//   VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY            - khóa bí mật
//   VAPID_SUBJECT                - vd: mailto:banlienlac@dongho-ma.vn
//   HOOK_SECRET                  - chuỗi bí mật tự đặt, phải khớp với header đặt trong Supabase Webhook

const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

function loaiLabel(loai) {
  if (loai === 'hi') return 'Việc hỷ (cưới hỏi)';
  if (loai === 'chung') return 'Thông báo chung / họp họ';
  return 'Việc hiếu';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Xác thực yêu cầu thực sự đến từ Supabase Webhook (không phải ai đó gọi bừa)
  const auth = req.headers['authorization'] || '';
  if (process.env.HOOK_SECRET && auth !== `Bearer ${process.env.HOOK_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const record = body && body.record;
  if (!record) {
    res.status(400).json({ error: 'Thiếu dữ liệu thông báo (record).' });
    return;
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const { data: subs, error: subErr } = await supabase.from('push_subscriptions').select('*');
  if (subErr) {
    res.status(500).json({ error: 'Không tải được danh sách thiết bị: ' + subErr.message });
    return;
  }

  const payload = JSON.stringify({
    title: `${loaiLabel(record.loai)}: ${record.tieu_de || ''}`,
    body: record.nguoi_lien_quan || 'Dòng Họ Mà — bấm để xem chi tiết.',
    url: '/#hieu-hy',
  });

  let sent = 0;
  let removed = 0;
  for (const sub of subs || []) {
    const pushSubscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
    try {
      await webpush.sendNotification(pushSubscription, payload);
      sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        removed++;
      }
    }
  }

  res.status(200).json({ ok: true, sent, removed_subscriptions: removed });
};
