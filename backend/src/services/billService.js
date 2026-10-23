/**
 * Bill & Document Service
 * Sinh mẫu hóa đơn in nhiệt khổ K80 (80mm) và phiếu nhặt hàng (Picking Slip)
 * định dạng HTML sẵn sàng để in trực tiếp từ trình duyệt hoặc máy in bill POS.
 */

/**
 * Tạo mã HTML hóa đơn in nhiệt K80 (80mm) cho bán hàng tại quầy và online
 * @param {Object} order - Thông tin chi tiết đơn hàng
 * @param {Object} storeInfo - Thông tin cửa hàng
 * @returns {string} Chuỗi HTML hóa đơn K80
 */
exports.generateK80ReceiptHtml = (order, storeInfo = {}) => {
  const store = {
    name: storeInfo.name || 'TIỆM ỐC - BAKING AI STORE',
    address: storeInfo.address || 'Tiệm Ốc, Đường Nguyễn Trác, Phường Dương Nội, Thành phố Hà Nội',
    phone: storeInfo.phone || '0339667754',
    ...storeInfo
  };

  const createdDate = order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN');

  const itemsHtml = (order.order_items || []).map((item, idx) => {
    const name = item.products?.name || item.name || 'Sản phẩm';
    const unit = item.products?.unit || 'cái';
    const qty = item.quantity || 1;
    const price = Number(item.unit_price || 0).toLocaleString('vi-VN');
    const total = Number(item.subtotal || (qty * (item.unit_price || 0))).toLocaleString('vi-VN');

    return `
      <tr>
        <td style="padding: 4px 0; font-size: 13px;">${idx + 1}. ${name}<br>
          <small style="color: #666;">${qty} ${unit} x ${price}đ</small>
        </td>
        <td style="text-align: right; vertical-align: bottom; font-size: 13px; font-weight: bold;">${total}đ</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Hóa đơn ${order.order_code}</title>
  <style>
    @media print {
      @page { margin: 0; size: 80mm auto; }
      body { margin: 5mm; }
    }
    body {
      font-family: 'Courier New', Courier, monospace, sans-serif;
      width: 72mm;
      margin: 0 auto;
      padding: 6px;
      color: #000;
      background: #fff;
    }
    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
    .store-name { font-size: 16px; font-weight: bold; text-transform: uppercase; }
    .store-info { font-size: 11px; margin-top: 2px; }
    .title { font-size: 14px; font-weight: bold; margin: 8px 0 4px; text-transform: uppercase; text-align: center; }
    .meta { font-size: 11px; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
    .table-items { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    .summary { border-top: 1px dashed #000; padding-top: 6px; font-size: 12px; }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .total-row { font-size: 15px; font-weight: bold; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
    .footer { text-align: center; font-size: 11px; margin-top: 12px; border-top: 1px dashed #000; padding-top: 8px; }
  </style>
</head>
<body onload="window.print()">
  <div class="header">
    <div class="store-name">${store.name}</div>
    <div class="store-info">${store.address}</div>
    <div class="store-info">Hotline: ${store.phone}</div>
  </div>

  <div class="title">HÓA ĐƠN BÁN HÀNG</div>

  <div class="meta">
    <div>Mã đơn: <strong>${order.order_code}</strong></div>
    <div>Thời gian: ${createdDate}</div>
    <div>Thu ngân / NV: ${order.staff?.full_name || 'Hệ thống POS'}</div>
    ${order.recipient_name ? `<div>Khách hàng: ${order.recipient_name} ${order.recipient_phone ? `(${order.recipient_phone})` : ''}</div>` : ''}
  </div>

  <table class="table-items">
    ${itemsHtml}
  </table>

  <div class="summary">
    <div class="summary-row">
      <span>Tổng tiền hàng:</span>
      <span>${Number(order.total_amount || 0).toLocaleString('vi-VN')}đ</span>
    </div>
    ${Number(order.discount_amount || 0) > 0 ? `
    <div class="summary-row" style="color: #b91c1c;">
      <span>Giảm giá:</span>
      <span>-${Number(order.discount_amount).toLocaleString('vi-VN')}đ</span>
    </div>` : ''}
    ${Number(order.shipping_fee || 0) > 0 ? `
    <div class="summary-row">
      <span>Phí giao hàng:</span>
      <span>+${Number(order.shipping_fee).toLocaleString('vi-VN')}đ</span>
    </div>` : ''}
    <div class="summary-row total-row">
      <span>THANH TOÁN:</span>
      <span>${Number(order.final_amount || 0).toLocaleString('vi-VN')}đ</span>
    </div>
    <div class="summary-row" style="margin-top: 4px; font-size: 11px;">
      <span>Hình thức:</span>
      <span>${order.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản VietQR'} (${order.payment_status === 'paid' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'})</span>
    </div>
  </div>

  <div class="footer">
    <p>Cảm ơn quý khách đã mua sắm tại<br><strong>${store.name}</strong>!</p>
    <p style="font-style: italic; font-size: 10px;">Quý khách vui lòng kiểm tra kỹ hàng trước khi rời quầy.</p>
  </div>
</body>
</html>
  `;
};

/**
 * Tạo phiếu soạn/nhặt hàng (Picking Slip) theo vị trí kệ và tủ mát
 * @param {Object} order - Thông tin đơn hàng kèm thông tin lô FEFO và vị trí kho
 * @returns {string} Chuỗi HTML phiếu nhặt hàng
 */
exports.generatePickingSlipHtml = (order) => {
  const itemsHtml = (order.order_items || []).map((item, idx) => {
    const product = item.products || {};
    const allocations = item.order_batch_allocations || [];
    const allocDetails = allocations.map(a =>
      `• Lô: <strong>${a.inventory_batches?.batch_code || 'N/A'}</strong> (HSD: ${a.inventory_batches?.expiry_date || 'N/A'}) - SL: <strong>${a.allocated_quantity}</strong>`
    ).join('<br>');

    return `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 8px; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px;">
          <strong>${product.name || 'Sản phẩm'}</strong><br>
          <small style="color: #666;">SKU: ${product.sku || 'N/A'}</small>
        </td>
        <td style="padding: 8px; text-align: center; font-size: 15px; font-weight: bold;">
          ${item.quantity} ${product.unit || 'cái'}
        </td>
        <td style="padding: 8px; font-size: 12px; line-height: 1.4;">
          ${allocDetails || '<span style="color: #888;">Chưa gán lô</span>'}
        </td>
        <td style="padding: 8px; text-align: center; border: 1px dashed #ccc; width: 40px;">
          [ &nbsp; ]
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Phiếu soạn hàng - ${order.order_code}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #f3f4f6; padding: 8px; border: 1px solid #ddd; text-align: left; font-size: 13px; }
    td { border: 1px solid #ddd; }
  </style>
</head>
<body onload="window.print()">
  <div class="header">
    <div>
      <h2 style="margin: 0 0 5px 0;">PHIẾU SOẠN HÀNG KHO (PICKING SLIP)</h2>
      <div>Mã đơn: <strong>${order.order_code}</strong> | Loại đơn: <strong>${order.order_type === 'pos' ? 'Tại quầy POS' : 'Giao hàng Online'}</strong></div>
      <div>Thời gian đặt: ${new Date(order.created_at).toLocaleString('vi-VN')}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 12px; color: #666;">Baking AI Store - Hệ thống FEFO</div>
      <div style="margin-top: 8px; padding: 4px 8px; background: #e0f2fe; color: #0369a1; border-radius: 4px; display: inline-block; font-weight: bold;">
        ${order.order_status?.toUpperCase()}
      </div>
    </div>
  </div>

  ${order.shipping_address ? `
  <div style="background: #f9fafb; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 13px;">
    <strong>Người nhận:</strong> ${order.recipient_name} - ${order.recipient_phone}<br>
    <strong>Địa chỉ giao:</strong> ${order.shipping_address}<br>
    ${order.notes ? `<strong>Ghi chú đơn:</strong> <span style="color: #b45309;">${order.notes}</span>` : ''}
  </div>` : ''}

  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">STT</th>
        <th>Tên mặt hàng & SKU</th>
        <th style="width: 80px; text-align: center;">SL cần</th>
        <th>Lô FEFO & HSD cần xuất</th>
        <th style="width: 60px; text-align: center;">Đã nhặt</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div style="margin-top: 30px; display: flex; justify-content: space-between; text-align: center;">
    <div>
      <div><strong>Nhân viên soạn hàng</strong></div>
      <div style="margin-top: 40px; font-size: 12px; color: #888;">(Ký & ghi rõ họ tên)</div>
    </div>
    <div>
      <div><strong>Nhân viên kiểm hàng</strong></div>
      <div style="margin-top: 40px; font-size: 12px; color: #888;">(Ký & ghi rõ họ tên)</div>
    </div>
  </div>
</body>
</html>
  `;
};
