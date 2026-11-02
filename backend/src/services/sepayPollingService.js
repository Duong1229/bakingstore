const axios = require('axios');
const supabase = require('../config/supabase');

// API v2 hỗ trợ cả Live và Test mode. API v1 cũ không có sandbox.
const SEPAY_API_BASE_URL = process.env.SEPAY_API_BASE_URL
  || (String(process.env.SEPAY_TEST_MODE).toLowerCase() === 'true'
    ? 'https://userapi-sandbox.sepay.vn/v2'
    : 'https://userapi.sepay.vn/v2');
const SEPAY_TRANSACTIONS_URL = process.env.SEPAY_TRANSACTIONS_URL || `${SEPAY_API_BASE_URL}/transactions`;
let pollingInProgress = false;

const apiToken = () => process.env.SEPAY_API_TOKEN || process.env.SEPAY_API_KEY || '';
const accountNumber = () => process.env.SEPAY_ACCOUNT_NUMBER || process.env.BANK_ACCOUNT_NO || '';
const configured = () => Boolean(apiToken() && accountNumber());
const parseTransactionDate = value => value ? new Date(String(value).replace(' ', 'T')) : null;
// SePay có thể trả nội dung chuyển khoản ở `code` hoặc `transaction_content`.
// Ghép cả hai để không bỏ sót mã đơn khi một trong hai trường trống/khác nhau.
const transactionCode = transaction => `${transaction.code || ''} ${transaction.transaction_content || ''}`.toUpperCase();
const incomingAmount = transaction => Number(transaction.amount_in || 0);

const listIncomingTransactions = async (fromDate) => {
  if (!configured()) {
    const error = new Error('Chưa cấu hình SEPAY_API_TOKEN và SEPAY_ACCOUNT_NUMBER để kiểm tra thanh toán tự động.');
    error.code = 'SEPAY_NOT_CONFIGURED';
    throw error;
  }
  const response = await axios.get(SEPAY_TRANSACTIONS_URL, {
    timeout: 10000,
    headers: { Authorization: `Bearer ${apiToken()}`, Accept: 'application/json' },
    params: {
      transaction_date_from: `${fromDate} 00:00:00`,
      transaction_date_to: `${new Date().toISOString().slice(0, 10)} 23:59:59`,
      transfer_type: 'in',
      transaction_date_sort: 'desc',
      timestamp_format: 'iso8601',
      per_page: 100,
    },
  });
  const payload = response.data?.transactions || response.data?.data || [];
  return Array.isArray(payload) ? payload : (payload.transactions || []);
};

const matchesOrder = (transaction, order) => {
  const requiredAmount = Number(order.final_amount);
  const transferTime = parseTransactionDate(transaction.transaction_date);
  const orderTime = new Date(order.created_at);
  const codeMatches = transactionCode(transaction).includes(String(order.order_code).toUpperCase());
  const amountMatches = Math.abs(incomingAmount(transaction) - requiredAmount) <= 1;
  const accountMatches = !accountNumber() || String(transaction.account_number || '') === String(accountNumber());
  // Bỏ qua các giao dịch cũ phát sinh trước lúc đơn được tạo (cho phép lệch
  // đồng hồ năm phút để không làm rơi giao dịch hợp lệ).
  const timeMatches = !transferTime || Number.isNaN(orderTime.getTime()) || transferTime >= new Date(orderTime.getTime() - 5 * 60 * 1000);
  return codeMatches && amountMatches && accountMatches && timeMatches;
};

const recordPaidOrder = async (order, transaction) => {
  if (order.payment_status === 'paid') return { matched: true, already_paid: true };
  if (order.order_status === 'cancelled') return { matched: false, reason: 'Đơn đã hủy.' };
  const transactionCodeValue = String(transaction.id || transaction.reference_number || '');
  if (!transactionCodeValue) return { matched: false, reason: 'SePay không trả về mã giao dịch.' };

  const { data: existingPayments, error: paymentLookupError } = await supabase
    .from('payments').select('id').eq('transaction_code', transactionCodeValue).limit(1);
  if (paymentLookupError) throw paymentLookupError;
  const existingPayment = existingPayments?.[0];
  if (!existingPayment) {
    const { error: insertError } = await supabase.from('payments').insert({
      order_id: order.id,
      gateway: 'sepay_api_polling',
      transaction_code: transactionCodeValue,
      bank_account_number: transaction.account_number || accountNumber(),
      amount: incomingAmount(transaction),
      payment_time: parseTransactionDate(transaction.transaction_date)?.toISOString() || new Date().toISOString(),
      raw_payload: transaction,
    });
    if (insertError) throw insertError;
  }

  const { data: paidOrder, error: updateError } = await supabase.from('orders')
    .update({ payment_status: 'paid', order_status: 'confirmed', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', order.id)
    .eq('payment_status', 'unpaid')
    .eq('order_status', 'pending')
    .select('id, order_code, payment_status, order_status')
    .maybeSingle();
  if (updateError) throw updateError;
  return { matched: true, paid: Boolean(paidOrder), order: paidOrder || order };
};

const checkOrderPayment = async (order) => {
  if (!configured()) return { configured: false, matched: false };
  const fromDate = new Date(Math.max(new Date(order.created_at).getTime() - 24 * 60 * 60 * 1000, Date.now() - 3 * 24 * 60 * 60 * 1000));
  const transactions = await listIncomingTransactions(fromDate.toISOString().slice(0, 10));
  const transaction = transactions.find(item => matchesOrder(item, order));
  if (!transaction) return { configured: true, matched: false };
  return { configured: true, ...(await recordPaidOrder(order, transaction)) };
};

const pollPendingSepayPayments = async () => {
  if (pollingInProgress || !configured()) return { skipped: true, configured: configured() };
  pollingInProgress = true;
  try {
    const { data: pendingOrders, error } = await supabase.from('orders')
      .select('id, order_code, final_amount, payment_status, order_status, created_at')
      .eq('payment_method', 'vietqr')
      .eq('payment_status', 'unpaid')
      .eq('order_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    if (!(pendingOrders || []).length) return { checked: 0, paid: 0 };
    const oldest = pendingOrders[pendingOrders.length - 1]?.created_at || new Date().toISOString();
    const transactions = await listIncomingTransactions(new Date(oldest).toISOString().slice(0, 10));
    let paid = 0;
    for (const order of pendingOrders) {
      const transaction = transactions.find(item => matchesOrder(item, order));
      if (transaction) {
        const result = await recordPaidOrder(order, transaction);
        if (result.paid) paid += 1;
      }
    }
    return { checked: pendingOrders.length, paid };
  } finally {
    pollingInProgress = false;
  }
};

module.exports = { configured, checkOrderPayment, pollPendingSepayPayments };
