const supabase = require('../config/supabase');
const fs = require('fs/promises');
const path = require('path');
const offlineCatalog = require('../data/offlineCatalog');

const messageText = value => String(value || '').trim();
const localStorePath = path.join(__dirname, '../../data/support-messages.json');
const tableIsNotReady = error => /support_messages|schema cache|does not exist/i.test(error?.message || '');
const useLocalMessages = error => tableIsNotReady(error) || /fetch failed|ENOTFOUND|network/i.test(String(error?.message || error));
const readLocalMessages = async () => {
  try { return JSON.parse(await fs.readFile(localStorePath, 'utf8')); } catch (_) { return []; }
};
const writeLocalMessages = async messages => {
  await fs.mkdir(path.dirname(localStorePath), { recursive: true });
  await fs.writeFile(localStorePath, JSON.stringify(messages, null, 2), 'utf8');
};
const productMarker = /\[\[product:([0-9a-f-]{8,})\]\]/i;
const makeProductContent = (content, productId) => productId ? `[[product:${productId}]]${content ? `\n${content}` : ''}` : content;
const readableContent = content => String(content || '').replace(productMarker, '').trim();
const productIdFromContent = content => String(content || '').match(productMarker)?.[1] || null;
const makeLocalMessage = ({ customerId, senderId, content, customerName }) => ({ id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, customer_id: customerId, sender_id: senderId, content, customer_name: customerName || null, read_at: null, created_at: new Date().toISOString() });

const addProductCards = async (messages) => {
  const productIds = [...new Set(messages.map(message => productIdFromContent(message.content)).filter(Boolean))];
  if (!productIds.length) return messages.map(message => ({ ...message, content: readableContent(message.content), product: null }));
  let products = [];
  const { data, error } = await supabase.from('products').select('id, name, slug, price, unit, image_url').in('id', productIds);
  if (!error) products = data || [];
  else if (useLocalMessages(error)) products = offlineCatalog.products.filter(product => productIds.includes(product.id));
  const productsById = Object.fromEntries(products.map(product => [product.id, product]));
  return messages.map(message => ({ ...message, content: readableContent(message.content), product: productsById[productIdFromContent(message.content)] || null }));
};

const findProduct = async (productId) => {
  const { data, error } = await supabase.from('products').select('id, name, slug, price, unit, image_url').eq('id', productId).eq('is_active', true).single();
  if (!error && data) return data;
  if (useLocalMessages(error)) {
    const fallback = offlineCatalog.products.find(product => product.id === productId && product.is_active !== false);
    if (fallback) return fallback;
  }
  throw Object.assign(new Error('Sản phẩm bạn muốn gửi không còn bán hoặc không tồn tại.'), { status: 404 });
};

exports.getMyMessages = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('support_messages')
      .select('id, sender_id, content, created_at, read_at')
      .eq('customer_id', req.user.id)
      .order('created_at', { ascending: true });
    if (error && !useLocalMessages(error)) throw error;
    const rawMessages = error ? (await readLocalMessages()).filter(message => message.customer_id === req.user.id) : (data || []);
    const messages = await addProductCards(rawMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
    res.json({ status: 'success', messages, storage: error ? 'local' : 'database' });
  } catch (err) { next(err); }
};

exports.sendMyMessage = async (req, res, next) => {
  try {
    const content = messageText(req.body.content);
    const productId = String(req.body.product_id || '').trim() || null;
    if (!content && !productId) return res.status(400).json({ status: 'error', message: 'Vui lòng nhập nội dung hoặc chọn sản phẩm để gửi.' });
    if (content.length > 2000) return res.status(400).json({ status: 'error', message: 'Tin nhắn tối đa 2.000 ký tự.' });
    if (productId) await findProduct(productId);
    const storedContent = makeProductContent(content, productId);
    const { data, error } = await supabase.from('support_messages')
      .insert({ customer_id: req.user.id, sender_id: req.user.id, content: storedContent })
      .select('id, sender_id, content, created_at, read_at').single();
    if (error && !useLocalMessages(error)) throw error;
    const rawMessage = error ? makeLocalMessage({ customerId: req.user.id, senderId: req.user.id, content: storedContent, customerName: req.user.full_name }) : data;
    if (error) { const messages = await readLocalMessages(); messages.push(rawMessage); await writeLocalMessages(messages); }
    const [chatMessage] = await addProductCards([rawMessage]);
    res.status(201).json({ status: 'success', message: 'Đã gửi tin nhắn đến Tiệm Ốc.', chat_message: chatMessage, storage: error ? 'local' : 'database' });
  } catch (err) { next(err); }
};

exports.getConversations = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('support_messages')
      .select('id, customer_id, sender_id, content, created_at, read_at')
      .order('created_at', { ascending: false });
    if (error && !useLocalMessages(error)) throw error;
    const messages = error ? await readLocalMessages() : (data || []);
    const customerIds = [...new Set(messages.map(item => item.customer_id))];
    const { data: customers, error: customersError } = !customerIds.length
      ? { data: [], error: null }
      : await supabase.from('users').select('id, full_name, email, phone').in('id', customerIds);
    if (customersError && !useLocalMessages(customersError)) throw customersError;
    const userById = Object.fromEntries((customers || []).map(user => [user.id, user]));
    const grouped = new Map();
    for (const item of messages) {
      if (!grouped.has(item.customer_id)) grouped.set(item.customer_id, { customer: userById[item.customer_id] || { id: item.customer_id, full_name: item.customer_name || `Khách hàng · ${String(item.customer_id).slice(-6)}` }, messages: [] });
      grouped.get(item.customer_id).messages.push(item);
    }
    const conversations = await Promise.all([...grouped.values()].map(async conversation => ({
      ...conversation,
      messages: await addProductCards(conversation.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))),
    })));
    res.json({ status: 'success', conversations: conversations.sort((a, b) => new Date(b.messages.at(-1)?.created_at || 0) - new Date(a.messages.at(-1)?.created_at || 0)) });
  } catch (err) { next(err); }
};

exports.replyToCustomer = async (req, res, next) => {
  try {
    const content = messageText(req.body.content);
    if (!content) return res.status(400).json({ status: 'error', message: 'Vui lòng nhập nội dung phản hồi.' });
    if (content.length > 2000) return res.status(400).json({ status: 'error', message: 'Tin nhắn tối đa 2.000 ký tự.' });
    const { data: customer, error: customerError } = await supabase.from('users').select('id, role').eq('id', req.params.customerId).single();
    const localMode = useLocalMessages(customerError);
    if ((!localMode && customerError) || (!localMode && (!customer || customer.role !== 'customer'))) return res.status(404).json({ status: 'error', message: 'Không tìm thấy khách hàng.' });
    const { data, error } = await supabase.from('support_messages')
      .insert({ customer_id: localMode ? req.params.customerId : customer.id, sender_id: req.user.id, content })
      .select('id, customer_id, sender_id, content, created_at, read_at').single();
    if (error && !useLocalMessages(error)) throw error;
    const chatMessage = error ? makeLocalMessage({ customerId: localMode ? req.params.customerId : customer.id, senderId: req.user.id, content }) : data;
    if (error) { const messages = await readLocalMessages(); messages.push(chatMessage); await writeLocalMessages(messages); }
    res.status(201).json({ status: 'success', message: 'Đã gửi phản hồi.', chat_message: chatMessage, storage: error ? 'local' : 'database' });
  } catch (err) { next(err); }
};
