const supabase = require('../config/supabase');

/**
 * Thuật toán FEFO (First Expired, First Out)
 * Tự động phân bổ số lượng cần xuất từ các lô hàng,
 * ưu tiên lô nào có hạn sử dụng gần nhất trước.
 *
 * @param {string} productId - UUID sản phẩm
 * @param {number} quantityNeeded - Số lượng cần xuất
 * @returns {Array} Danh sách phân bổ: [{ batch_id, allocated_qty, batch_code, expiry_date }]
 */
exports.allocateFEFO = async (productId, quantityNeeded) => {
  const today = new Date().toISOString().split('T')[0];

  // Lấy danh sách lô còn hạn, sắp xếp hạn gần nhất trước (FEFO)
  const { data: batches, error } = await supabase
    .from('inventory_batches')
    .select('id, batch_code, expiry_date, current_quantity')
    .eq('product_id', productId)
    .eq('status', 'active')
    .gte('expiry_date', today)
    .order('expiry_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;

  const totalAvailable = batches.reduce((sum, b) => sum + b.current_quantity, 0);
  if (totalAvailable < quantityNeeded) {
    throw new Error(`Không đủ tồn kho khả dụng. Tồn kho còn hạn: ${totalAvailable}, cần: ${quantityNeeded}.`);
  }

  let remaining = quantityNeeded;
  const allocations = [];

  for (const batch of batches) {
    if (remaining <= 0) break;
    const allocQty = Math.min(batch.current_quantity, remaining);
    remaining -= allocQty;

    const newQty = batch.current_quantity - allocQty;
    const newStatus = newQty === 0 ? 'depleted' : 'active';

    // Cập nhật tồn kho của lô
    const { error: updateErr } = await supabase
      .from('inventory_batches')
      .update({ current_quantity: newQty, status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', batch.id);
    if (updateErr) throw updateErr;

    allocations.push({
      batch_id: batch.id,
      allocated_qty: allocQty,
      batch_code: batch.batch_code,
      expiry_date: batch.expiry_date
    });
  }

  return allocations;
};

/**
 * Kiểm tra tổng tồn kho còn hạn sử dụng của một sản phẩm
 * @param {string} productId
 * @returns {number} Tổng tồn kho khả dụng
 */
exports.getAvailableStock = async (productId) => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('inventory_batches')
    .select('current_quantity')
    .eq('product_id', productId)
    .eq('status', 'active')
    .gte('expiry_date', today);
  if (error) throw error;
  return data.reduce((sum, b) => sum + b.current_quantity, 0);
};

/**
 * Hoàn trả tồn kho (dùng khi đơn hàng bị hủy)
 * Cộng ngược lại số lượng vào từng lô phân bổ ban đầu
 * @param {Array} allocations - Mảng phân bổ cần hoàn trả
 */
exports.restoreStock = async (allocations) => {
  for (const alloc of allocations) {
    const { data: batch } = await supabase
      .from('inventory_batches')
      .select('current_quantity, original_quantity')
      .eq('id', alloc.batch_id)
      .single();
    if (!batch) continue;
    const restoredQty = batch.current_quantity + alloc.allocated_qty;
    await supabase
      .from('inventory_batches')
      .update({ current_quantity: restoredQty, status: 'active', updated_at: new Date().toISOString() })
      .eq('id', alloc.batch_id);
  }
};
