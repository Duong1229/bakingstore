const ExcelJS = require('exceljs');

/**
 * Excel Service
 * Xử lý nhập/xuất dữ liệu kho hàng bằng file Excel (.xlsx)
 */

/**
 * Đọc và xử lý file Excel nhập lô hàng hàng loạt
 * Cột quy ước:
 * A (1): STT
 * B (2): SKU sản phẩm (bắt buộc)
 * C (3): Mã lô hàng (bắt buộc)
 * D (4): Ngày sản xuất (YYYY-MM-DD)
 * E (5): Hạn sử dụng (YYYY-MM-DD, bắt buộc)
 * F (6): Số lượng nhập (bắt buộc, số nguyên dương)
 * G (7): Giá nhập (VND)
 *
 * @param {Buffer} fileBuffer - Buffer dữ liệu file tải lên
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<Object>} Kết quả xử lý { success, failed, errors }
 */
exports.parseInventoryBatchExcel = async (fileBuffer, supabase) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('File Excel không có dữ liệu trang tính (worksheet).');
  }

  const results = { success: 0, failed: 0, errors: [] };

  // Duyệt từ dòng 2 (bỏ qua dòng tiêu đề 1)
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (!row || !row.hasValues) continue;

    const values = row.values;
    const sku = values[2] ? String(values[2]).trim() : null;
    const batch_code = values[3] ? String(values[3]).trim() : null;
    const manufacture_date = values[4] ? new Date(values[4]).toISOString().split('T')[0] : null;
    const expiry_date = values[5] ? new Date(values[5]).toISOString().split('T')[0] : null;
    const quantity = parseInt(values[6]);
    const import_price = parseFloat(values[7]) || 0;

    // Bỏ qua dòng trống rỗng
    if (!sku && !batch_code) continue;

    if (!sku || !batch_code || !expiry_date || isNaN(quantity) || quantity <= 0) {
      results.errors.push({
        row: rowNumber,
        message: `Dòng ${rowNumber}: Thiếu hoặc sai dữ liệu bắt buộc (SKU: ${sku || 'trống'}, Mã lô: ${batch_code || 'trống'}, HSD: ${expiry_date || 'trống'}, SL: ${quantity || 'trống'}).`
      });
      results.failed++;
      continue;
    }

    try {
      // 1. Kiểm tra SKU có tồn tại không
      const { data: product, error: pErr } = await supabase
        .from('products')
        .select('id, name')
        .eq('sku', sku)
        .single();

      if (pErr || !product) {
        results.errors.push({ row: rowNumber, message: `Dòng ${rowNumber}: SKU "${sku}" không tồn tại trong hệ thống.` });
        results.failed++;
        continue;
      }

      // 2. Kiểm tra mã lô trùng lặp
      const { data: existingBatch } = await supabase
        .from('inventory_batches')
        .select('id')
        .eq('batch_code', batch_code)
        .single();

      if (existingBatch) {
        results.errors.push({ row: rowNumber, message: `Dòng ${rowNumber}: Mã lô "${batch_code}" đã tồn tại.` });
        results.failed++;
        continue;
      }

      // 3. Thêm mới lô hàng
      const { error: insertErr } = await supabase
        .from('inventory_batches')
        .insert({
          product_id: product.id,
          batch_code,
          manufacture_date,
          expiry_date,
          original_quantity: quantity,
          current_quantity: quantity,
          import_price,
          status: 'active'
        });

      if (insertErr) throw insertErr;
      results.success++;
    } catch (err) {
      results.errors.push({ row: rowNumber, message: `Dòng ${rowNumber}: ${err.message}` });
      results.failed++;
    }
  }

  return results;
};

/**
 * Tạo file Excel mẫu (.xlsx buffer) để người dùng tải về điền dữ liệu
 * @returns {Promise<Buffer>} Buffer file Excel
 */
exports.generateBatchImportTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Baking AI Store';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Mau_Nhap_Kho');

  // Định dạng tiêu đề cột
  sheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Mã SKU (*)', key: 'sku', width: 18 },
    { header: 'Mã Lô Hàng (*)', key: 'batch_code', width: 22 },
    { header: 'Ngày Sản Xuất (YYYY-MM-DD)', key: 'mfg_date', width: 25 },
    { header: 'Hạn Sử Dụng (*) (YYYY-MM-DD)', key: 'exp_date', width: 28 },
    { header: 'Số Lượng (*)', key: 'quantity', width: 15 },
    { header: 'Giá Nhập (VNĐ)', key: 'import_price', width: 18 }
  ];

  // Dòng mẫu gợi ý — SKU thuộc seed.sql để tải về là có thể kiểm thử ngay.
  [
    [1, 'BOT-MI-11', 'LO-BOT11-TEST-001', '2026-09-20', '2027-09-20', 50, 18500],
    [2, 'MEN-MAURIPAN', 'LO-MEN-TEST-001', '2026-09-18', '2027-03-18', 30, 42000],
    [3, 'BO-LAT-ANC', 'LO-BO-TEST-001', '2026-09-21', '2027-03-21', 24, 58000],
    [4, 'WHIP-ANC', 'LO-WHIP-TEST-001', '2026-09-22', '2026-12-22', 36, 52000],
    [5, 'MASCARPONE-TATUA', 'LO-MASC-TEST-001', '2026-09-20', '2027-01-20', 20, 98000],
    [6, 'BOT-CACAO', 'LO-CACAO-TEST-001', '2026-09-15', '2027-09-15', 40, 22000],
    [7, 'VANI-RAYNER', 'LO-VANI-TEST-001', '2026-09-19', '2028-09-19', 25, 28000],
    [8, 'SET-TIRAMISU-4P', 'LO-TIRA-TEST-001', '2026-09-23', '2026-11-23', 12, 180000]
  ].forEach(([stt, sku, batch_code, mfg_date, exp_date, quantity, import_price]) => {
    sheet.addRow({ stt, sku, batch_code, mfg_date, exp_date, quantity, import_price });
  });

  // Tô màu header
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD97706' } // Cam hổ phách ấm áp
  };

  return await workbook.xlsx.writeBuffer();
};
