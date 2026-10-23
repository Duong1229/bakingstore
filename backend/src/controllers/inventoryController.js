const supabase = require('../config/supabase');
const excelService = require('../services/excelService');
const disposalDocumentService = require('../services/disposalDocumentService');

// [GET] /api/inventory/batches - Lấy danh sách tất cả lô hàng (Admin)
exports.getBatches = async (req, res, next) => {
  try {
    const { product_id, status, expiring_days } = req.query;
    let query = supabase
      .from('inventory_batches')
      .select(`
        id, product_id, batch_code, manufacture_date, expiry_date,
        original_quantity, current_quantity, import_price, status, created_at,
        products(id, sku, name, unit, image_url),
        purchase_orders(po_code, import_date)
      `)
      .order('expiry_date', { ascending: true });

    if (product_id) query = query.eq('product_id', product_id);
    if (status) query = query.eq('status', status);

    // Lọc lô sắp hết hạn trong N ngày
    if (expiring_days) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(expiring_days));
      query = query
        .eq('status', 'active')
        .gte('expiry_date', new Date().toISOString().split('T')[0])
        .lte('expiry_date', futureDate.toISOString().split('T')[0]);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ status: 'success', batches: data });
  } catch (err) {
    next(err);
  }
};

// [POST] /api/inventory/batches - Nhập lô hàng thủ công (Admin)
exports.addBatch = async (req, res, next) => {
  try {
    const { product_id, batch_code, manufacture_date, expiry_date, quantity, import_price, purchase_order_id } = req.body;
    if (!product_id || !batch_code || !expiry_date || !quantity) {
      return res.status(400).json({ status: 'error', message: 'Vui lòng điền đầy đủ: sản phẩm, mã lô, hạn sử dụng, số lượng.' });
    }
    const { data, error } = await supabase
      .from('inventory_batches')
      .insert({
        product_id, batch_code, manufacture_date: manufacture_date || null, expiry_date,
        original_quantity: quantity, current_quantity: quantity,
        import_price: import_price || 0, purchase_order_id, status: 'active'
      })
      .select(`*, products(name, sku)`)
      .single();
    if (error) throw error;
    res.status(201).json({ status: 'success', message: 'Đã nhập lô hàng mới vào kho!', batch: data });
  } catch (err) {
    next(err);
  }
};

// [PUT] /api/inventory/batches/:id - Điều chỉnh thông tin/lượng tồn của một lô sau kiểm kho
exports.updateBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { product_id, batch_code, manufacture_date, expiry_date, current_quantity, import_price, status } = req.body;
    if (!product_id || !batch_code || !expiry_date || current_quantity === undefined || Number(current_quantity) < 0) {
      return res.status(400).json({ status: 'error', message: 'Vui lòng điền sản phẩm, mã lô, hạn dùng và số lượng tồn hợp lệ.' });
    }
    const nextStatus = Number(current_quantity) === 0 ? 'depleted' : (status || 'active');
    const { data, error } = await supabase
      .from('inventory_batches')
      .update({ product_id, batch_code, manufacture_date: manufacture_date || null, expiry_date, current_quantity: Number(current_quantity), import_price: Number(import_price || 0), status: nextStatus })
      .eq('id', id)
      .select('*, products(id, name, sku, unit)')
      .single();
    if (error) throw error;
    res.json({ status: 'success', message: 'Đã lưu điều chỉnh lô hàng.', batch: data });
  } catch (err) {
    next(err);
  }
};

// [DELETE] /api/inventory/batches/:id - Xóa lô nhập nhầm/chưa dùng
exports.deleteBatch = async (req, res, next) => {
  try {
    const { error } = await supabase.from('inventory_batches').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ status: 'success', message: 'Đã xóa lô hàng.' });
  } catch (err) {
    next(err);
  }
};

// [PUT] /api/inventory/batches/:id/status - Cập nhật trạng thái lô hàng (Admin)
exports.updateBatchStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' | 'expired' | 'depleted' | 'discarded'
    const { data, error } = await supabase
      .from('inventory_batches')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ status: 'success', message: 'Đã cập nhật trạng thái lô hàng!', batch: data });
  } catch (err) {
    next(err);
  }
};

// [POST] /api/inventory/batches/:id/dispose - Lập phiếu xuất tiêu hủy lô đã hết hạn.
// Không xóa lịch sử lô: số lượng, người lập và lý do luôn được giữ để đối soát kho.
exports.disposeExpiredBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body || {};
    const today = new Date().toISOString().slice(0, 10);
    const { data: batch, error: batchError } = await supabase
      .from('inventory_batches')
      .select('id, product_id, batch_code, expiry_date, current_quantity, status, products(name, sku, unit)')
      .eq('id', id)
      .single();
    if (batchError || !batch) return res.status(404).json({ status: 'error', message: 'Không tìm thấy lô hàng.' });
    if (batch.expiry_date >= today) return res.status(400).json({ status: 'error', message: 'Chỉ lập phiếu tiêu hủy cho lô đã hết hạn.' });
    if (Number(batch.current_quantity) <= 0) return res.status(400).json({ status: 'error', message: 'Lô này đã hết số lượng tồn, không cần lập thêm phiếu tiêu hủy.' });

    const disposalCode = `TH-${today.replaceAll('-', '')}-${String(Date.now()).slice(-6)}`;
    const { data: disposal, error: disposalError } = await supabase
      .from('inventory_audits')
      .insert({ audit_code: disposalCode, auditor_id: req.user.id, audit_date: today, status: 'completed', notes: `PHIẾU XUẤT KHO - TIÊU HỦY HÀNG HẾT HẠN${note ? `: ${String(note).trim()}` : ''}` })
      .select('id, audit_code, created_at')
      .single();
    if (disposalError) throw disposalError;
    const { error: itemError } = await supabase.from('inventory_audit_items').insert({ audit_id: disposal.id, batch_id: batch.id, system_quantity: batch.current_quantity, actual_quantity: 0, diff_quantity: -Number(batch.current_quantity), reason: 'Tiêu hủy hàng hết hạn' });
    if (itemError) throw itemError;

    const { data: updatedBatch, error: updateError } = await supabase
      .from('inventory_batches')
      .update({ current_quantity: 0, status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', batch.id)
      .select('id, batch_code, current_quantity, status')
      .single();
    if (updateError) throw updateError;
    res.status(201).json({ status: 'success', message: `Đã lập phiếu xuất tiêu hủy ${disposal.audit_code} cho lô ${batch.batch_code}.`, disposal: { disposal_code: disposal.audit_code }, batch: updatedBatch });
  } catch (err) { next(err); }
};

// [POST] /api/inventory/disposals/export - Chọn nhiều lô hết hạn, xuất phiếu và ghi nhận tiêu hủy.
exports.exportExpiredDisposals = async (req, res, next) => {
  try {
    const batchIds = [...new Set((req.body?.batch_ids || []).filter(Boolean))];
    const format = req.body?.format === 'pdf' ? 'pdf' : 'xlsx';
    const note = String(req.body?.note || '').trim();
    if (!batchIds.length) return res.status(400).json({ status: 'error', message: 'Vui lòng chọn ít nhất một lô hết hạn.' });
    const today = new Date().toISOString().slice(0, 10);
    const { data: batches, error } = await supabase.from('inventory_batches')
      .select('id, product_id, batch_code, expiry_date, current_quantity, products(name, sku, unit)')
      .in('id', batchIds);
    if (error) throw error;
    if ((batches || []).length !== batchIds.length) return res.status(404).json({ status: 'error', message: 'Có lô hàng không còn tồn tại.' });
    const invalid = batches.filter(batch => batch.expiry_date >= today);
    if (invalid.length) return res.status(400).json({ status: 'error', message: `Chỉ có thể lập phiếu cho lô đã hết hạn: ${invalid.map(item => item.batch_code).join(', ')}.` });

    const pendingBatches = batches.filter(batch => Number(batch.current_quantity) > 0);
    const disposedBatches = batches.filter(batch => Number(batch.current_quantity) <= 0);
    const documentCode = `${pendingBatches.length ? 'PXTH' : 'PXTH-IN-LAI'}-${today.replaceAll('-', '')}-${String(Date.now()).slice(-6)}`;
    const disposedQuantities = new Map();
    if (disposedBatches.length) {
      const { data: priorItems, error: priorError } = await supabase.from('inventory_audit_items')
        .select('batch_id, system_quantity, created_at')
        .in('batch_id', disposedBatches.map(item => item.id))
        .eq('reason', 'Tiêu hủy hàng hết hạn')
        .order('created_at', { ascending: false });
      if (priorError) throw priorError;
      for (const item of priorItems || []) if (!disposedQuantities.has(item.batch_id)) disposedQuantities.set(item.batch_id, Number(item.system_quantity));
      const withoutHistory = disposedBatches.filter(batch => !disposedQuantities.has(batch.id));
      if (withoutHistory.length) return res.status(400).json({ status: 'error', message: `Không tìm thấy phiếu tiêu hủy trước đó cho: ${withoutHistory.map(item => item.batch_code).join(', ')}.` });
    }
    const documentItems = batches.map(batch => ({ batch_id: batch.id, sku: batch.products?.sku, name: batch.products?.name, unit: batch.products?.unit, batch_code: batch.batch_code, expiry_date: batch.expiry_date, quantity: Number(batch.current_quantity) || disposedQuantities.get(batch.id) || 0 }));
    if (pendingBatches.length) {
      const { data: audit, error: auditError } = await supabase.from('inventory_audits')
        .insert({ audit_code: documentCode, auditor_id: req.user.id, audit_date: today, status: 'completed', notes: `PHIẾU XUẤT KHO - TIÊU HỦY HÀNG HẾT HẠN${note ? `: ${note}` : ''}` })
        .select('id').single();
      if (auditError) throw auditError;
      const auditItems = pendingBatches.map(batch => ({ audit_id: audit.id, batch_id: batch.id, system_quantity: Number(batch.current_quantity), actual_quantity: 0, diff_quantity: -Number(batch.current_quantity), reason: 'Tiêu hủy hàng hết hạn' }));
      const { error: itemError } = await supabase.from('inventory_audit_items').insert(auditItems);
      if (itemError) throw itemError;
      const { error: updateError } = await supabase.from('inventory_batches').update({ current_quantity: 0, status: 'expired', updated_at: new Date().toISOString() }).in('id', pendingBatches.map(item => item.id));
      if (updateError) throw updateError;
    }

    const issuedBy = req.user.full_name || req.user.email || 'Quản trị viên';
    const filename = `${documentCode}.${format}`;
    if (format === 'pdf') {
      const buffer = await disposalDocumentService.generatePdf({ documentCode, items: documentItems, issuedBy, note: pendingBatches.length ? note : 'Bản in lại phiếu tiêu hủy đã lập' });
      res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="${filename}"`); return res.send(buffer);
    }
    const buffer = await disposalDocumentService.generateExcel({ documentCode, items: documentItems, issuedBy, note: pendingBatches.length ? note : 'Bản in lại phiếu tiêu hủy đã lập' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition', `attachment; filename="${filename}"`); return res.send(Buffer.from(buffer));
  } catch (err) { next(err); }
};

// [GET] /api/inventory/stock-summary - Tổng hợp tồn kho và lô sắp hết hạn
exports.getStockSummary = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: batches, error } = await supabase
      .from('inventory_batches')
      .select(`
        product_id, current_quantity, expiry_date, status,
        products(id, sku, name, unit, category_id)
      `)
      .eq('status', 'active')
      .gte('expiry_date', today);

    if (error) throw error;

    // Gom nhóm theo product_id
    const stockMap = {};
    for (const batch of batches) {
      const pid = batch.product_id;
      if (!stockMap[pid]) {
        stockMap[pid] = { ...batch.products, total_stock: 0, batches_count: 0, nearest_expiry: null };
      }
      stockMap[pid].total_stock += batch.current_quantity;
      stockMap[pid].batches_count += 1;
      if (!stockMap[pid].nearest_expiry || batch.expiry_date < stockMap[pid].nearest_expiry) {
        stockMap[pid].nearest_expiry = batch.expiry_date;
      }
    }

    res.json({ status: 'success', stock: Object.values(stockMap) });
  } catch (err) {
    next(err);
  }
};

// [POST] /api/inventory/import-excel - Nhập kho hàng loạt bằng file Excel (Admin)
exports.importExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'Vui lòng upload file Excel (.xlsx).' });
    }

    let results;
    try {
      results = await excelService.parseInventoryBatchExcel(req.file.buffer, supabase);
    } catch (parseError) {
      return res.status(400).json({ status: 'error', message: 'Không đọc được file Excel. Vui lòng tải lại “Mẫu Excel” trong trang kho, điền dữ liệu từ dòng 2 và thử lại.' });
    }

    res.json({
      status: 'success',
      message: `Nhập kho Excel hoàn tất: ${results.success} lô thành công, ${results.failed} lô thất bại.`,
      results
    });
  } catch (err) {
    next(err);
  }
};

// [GET] /api/inventory/download-template - Tải file Excel mẫu để nhập kho (Admin)
exports.downloadTemplate = async (req, res, next) => {
  try {
    const buffer = await excelService.generateBatchImportTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Mau_Nhap_Kho_FEFO.xlsx"');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

// [GET] /api/inventory/locations - Lấy danh sách vị trí kho
exports.getLocations = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('warehouse_locations')
      .select('*')
      .order('zone_type');
    if (error) throw error;
    res.json({ status: 'success', locations: data });
  } catch (err) {
    next(err);
  }
};

// [PUT] /api/admin/inventory/locations/:id - Cập nhật vị trí kho (Chỉ Admin)
exports.updateLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('warehouse_locations')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ status: 'success', message: 'Đã cập nhật vị trí kho!', location: data });
  } catch (err) {
    next(err);
  }
};
