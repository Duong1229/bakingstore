const supabase = require('../config/supabase');
const fefoService = require('../services/fefoService');
const offlineCatalog = require('../data/offlineCatalog');

// Chỉ cho phép các trường thật sự có trong bảng products. Dữ liệu tính toán như
// stock_quantity được API trả về để hiển thị, tuyệt đối không được ghi ngược vào DB.
const productPayload = (body = {}) => {
  const allowed = ['name', 'slug', 'sku', 'category_id', 'price', 'unit', 'image_url', 'description', 'is_combo', 'is_active', 'barcode', 'supplier_id'];
  return Object.fromEntries(allowed.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
};

const sendOfflineProducts = (req, res) => {
  const { category, is_combo, search, page = 1, limit = 20 } = req.query;
  let products = [...offlineCatalog.products];
  if (category) products = products.filter(product => product.categories?.id === category || product.categories?.slug === category);
  if (is_combo !== undefined) products = products.filter(product => product.is_combo === (is_combo === 'true'));
  if (search) {
    const term = String(search).toLocaleLowerCase('vi-VN');
    products = products.filter(product => `${product.name} ${product.sku} ${product.description}`.toLocaleLowerCase('vi-VN').includes(term));
  }
  const start = (Number(page) - 1) * Number(limit);
  return res.json({ status: 'success', total: products.length, page: Number(page), limit: Number(limit), products: products.slice(start, start + Number(limit)), offline: true });
};

// [GET] /api/products - Lấy danh sách sản phẩm (có lọc, phân trang, tìm kiếm)
exports.getProducts = async (req, res, next) => {
  try {
    if (offlineCatalog.shouldUseOffline()) return sendOfflineProducts(req, res);
    const { category, is_combo, search, include_inactive, page = 1, limit = 20, sort = 'created_at', order = 'desc' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = supabase
      .from('products')
      .select(`
        id, sku, name, slug, description, price, unit, image_url, is_combo,
        rating_average, rating_count, is_active,
        categories(id, name, slug),
        warehouse_locations(id, code, name, zone_type)
      `, { count: 'exact' })
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + parseInt(limit) - 1);

    if (!(include_inactive === 'true' && req.user?.role === 'admin')) query = query.eq('is_active', true);

    if (category) query = query.eq('category_id', category);
    if (is_combo !== undefined) query = query.eq('is_combo', is_combo === 'true');
    if (search) query = query.ilike('name', `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;
    const productsWithStock = await Promise.all((data || []).map(async product => ({
      ...product,
      stock_quantity: await fefoService.getAvailableStock(product.id)
    })));
    res.json({
      status: 'success',
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      products: productsWithStock
    });
  } catch (err) {
    if (offlineCatalog.isConnectionFailure(err)) {
      offlineCatalog.markDatabaseUnavailable();
      return sendOfflineProducts(req, res);
    }
    next(err);
  }
};

// [GET] /api/products/:slug - Lấy chi tiết 1 sản phẩm theo slug
exports.getProductBySlug = async (req, res, next) => {
  try {
    const slug = decodeURIComponent(req.params.slug || '').trim();
    if (offlineCatalog.shouldUseOffline()) {
      const product = offlineCatalog.products.find(item => [item.id, item.slug, item.sku, item.name].some(value => String(value || '').toLocaleLowerCase('vi-VN') === slug.toLocaleLowerCase('vi-VN')));
      return product ? res.json({ status: 'success', product: { ...product, warehouse_locations: null, combo_items: [] }, offline: true }) : res.status(404).json({ status: 'error', message: 'Không tìm thấy sản phẩm.' });
    }
    // Lấy sản phẩm nền trước. Không join ngược reviews ở đây vì sau khi có
    // phản hồi cửa hàng, quan hệ reviews → users có hai khóa ngoại và PostgREST
    // có thể coi join lồng nhau là mơ hồ, khiến một sản phẩm hợp lệ bị trả 404.
    const findProduct = (field, value) => supabase.from('products').select('*').eq(field, value).eq('is_active', true).maybeSingle();
    let { data: product, error } = await findProduct('slug', slug);
    if ((!product || error) && /^[0-9a-f-]{36}$/i.test(slug)) ({ data: product, error } = await findProduct('id', slug));
    if (!product || error) ({ data: product, error } = await findProduct('sku', slug));
    if (!product || error) ({ data: product, error } = await findProduct('name', slug));
    if (error && offlineCatalog.isConnectionFailure(error)) {
      offlineCatalog.markDatabaseUnavailable();
      const requested = String(req.params.slug || '').toLocaleLowerCase('vi-VN');
      const offlineProduct = offlineCatalog.products.find(item => [item.id, item.slug, item.sku, item.name]
        .filter(Boolean)
        .some(value => String(value).toLocaleLowerCase('vi-VN') === requested));
      if (offlineProduct) return res.json({ status: 'success', product: { ...offlineProduct, warehouse_locations: null, combo_items: [] }, offline: true });
    }
    if (error || !product) {
      return res.status(404).json({ status: 'error', message: 'Không tìm thấy sản phẩm.' });
    }

    const [{ data: category }, { data: location }, { data: comboItems }] = await Promise.all([
      product.category_id ? supabase.from('categories').select('id, name, slug').eq('id', product.category_id).maybeSingle() : Promise.resolve({ data: null }),
      product.location_id ? supabase.from('warehouse_locations').select('id, code, name, zone_type, temperature_range').eq('id', product.location_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('combo_items').select('quantity, component_product_id').eq('combo_product_id', product.id),
    ]);
    const componentIds = (comboItems || []).map(item => item.component_product_id).filter(Boolean);
    const { data: components } = componentIds.length
      ? await supabase.from('products').select('id, sku, name, slug, price, unit, image_url').in('id', componentIds)
      : { data: [] };
    const componentsById = Object.fromEntries((components || []).map(item => [item.id, item]));
    const hydratedComboItems = (comboItems || []).map(item => ({ ...item, component_product: componentsById[item.component_product_id] || null }));

    // Lấy tổng tồn kho còn khả dụng theo FEFO
    const { data: stock } = await supabase
      .from('inventory_batches')
      .select('current_quantity')
      .eq('product_id', product.id)
      .eq('status', 'active')
      .gte('expiry_date', new Date().toISOString().split('T')[0]);
    const totalStock = stock?.reduce((sum, b) => sum + b.current_quantity, 0) || 0;

    res.json({ status: 'success', product: { ...product, categories: category || null, warehouse_locations: location || null, combo_items: hydratedComboItems, stock_quantity: totalStock } });
  } catch (err) {
    if (offlineCatalog.isConnectionFailure(err)) {
      offlineCatalog.markDatabaseUnavailable();
      const requested = String(req.params.slug || '').toLocaleLowerCase('vi-VN');
      const product = offlineCatalog.products.find(item => [item.id, item.slug, item.sku, item.name]
        .filter(Boolean)
        .some(value => String(value).toLocaleLowerCase('vi-VN') === requested));
      if (product) return res.json({ status: 'success', product: { ...product, warehouse_locations: null, combo_items: [] }, offline: true });
      return res.status(404).json({ status: 'error', message: 'Không tìm thấy sản phẩm.' });
    }
    next(err);
  }
};

// [POST] /api/products/validate-cart - kiểm tra giỏ trước khi khách đi thanh toán
exports.validateCart = async (req, res, next) => {
  try {
    const requestedItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const ids = [...new Set(requestedItems.map(item => item.id || item.product_id).filter(Boolean))];
    if (!ids.length) return res.json({ status: 'success', items: [] });

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, is_active')
      .in('id', ids);
    if (error) throw error;
    const productsById = new Map((products || []).map(product => [product.id, product]));
    const items = await Promise.all(requestedItems.map(async item => {
      const productId = item.id || item.product_id;
      const product = productsById.get(productId);
      const requestedQuantity = Math.max(1, Number(item.quantity) || 1);
      if (!product || !product.is_active) return { product_id: productId, available_quantity: 0, status: 'unavailable', name: item.name };
      const availableQuantity = await require('../services/fefoService').getAvailableStock(productId);
      return {
        product_id: productId,
        name: product.name,
        available_quantity: availableQuantity,
        status: availableQuantity <= 0 ? 'unavailable' : (requestedQuantity > availableQuantity ? 'limited' : 'available')
      };
    }));
    res.json({ status: 'success', items });
  } catch (err) { next(err); }
};

// [GET] /api/categories - Lấy danh sách danh mục
exports.getCategories = async (req, res, next) => {
  try {
    if (offlineCatalog.shouldUseOffline()) return res.json({ status: 'success', categories: offlineCatalog.categories, offline: true });
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, description, image_url')
      .order('name');
    if (error) throw error;
    res.json({ status: 'success', categories: data });
  } catch (err) {
    if (offlineCatalog.isConnectionFailure(err)) {
      return res.json({ status: 'success', categories: offlineCatalog.categories, offline: true });
    }
    next(err);
  }
};

// [POST] /api/admin/products - Thêm sản phẩm mới (Admin)
exports.createProduct = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert(productPayload(req.body))
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ status: 'success', message: 'Đã thêm sản phẩm mới!', product: data });
  } catch (err) {
    next(err);
  }
};

// [PUT] /api/admin/products/:id - Cập nhật sản phẩm (Admin)
exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: previous, error: previousError } = await supabase.from('products').select('price').eq('id', id).single();
    if (previousError) throw previousError;
    const { data, error } = await supabase
      .from('products')
      .update({ ...productPayload(req.body), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (req.body.price !== undefined && Number(previous.price) !== Number(data.price)) {
      const { error: historyError } = await supabase.from('product_price_history').insert({ product_id: id, old_price: previous.price, new_price: data.price, changed_by: req.user?.id || null });
      // The main product edit remains usable until the optional history migration is applied.
      if (historyError && !['42P01', 'PGRST205'].includes(historyError.code)) throw historyError;
    }
    res.json({ status: 'success', message: 'Đã cập nhật sản phẩm!', product: data });
  } catch (err) {
    next(err);
  }
};

exports.getPriceHistory = async (req, res, next) => {
  try {
    if (offlineCatalog.shouldUseOffline()) return res.json({ status: 'success', history: [], offline: true });
    const { data, error } = await supabase.from('product_price_history').select('id, old_price, new_price, changed_at, users(full_name)').eq('product_id', req.params.id).order('changed_at', { ascending: false });
    if (error && offlineCatalog.isConnectionFailure(error)) return res.json({ status: 'success', history: [], offline: true });
    if (error && !['42P01', 'PGRST205'].includes(error.code)) throw error;
    res.json({ status: 'success', history: data || [] });
  } catch (err) {
    if (offlineCatalog.isConnectionFailure(err)) return res.json({ status: 'success', history: [], offline: true });
    next(err);
  }
};

// [DELETE] /api/admin/products/:id - Ẩn sản phẩm (Admin - soft delete)
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    res.json({ status: 'success', message: 'Đã ẩn sản phẩm khỏi cửa hàng.' });
  } catch (err) {
    next(err);
  }
};

// [GET] /api/products/sku/:sku - Tìm sản phẩm bằng mã SKU (POS quét barcode/QR)
exports.getProductBySku = async (req, res, next) => {
  try {
    const { sku } = req.params;
    const { data: product, error } = await supabase
      .from('products')
      .select(`*, categories(name), warehouse_locations(code, name)`)
      .eq('sku', sku)
      .eq('is_active', true)
      .single();
    if (error || !product) {
      return res.status(404).json({ status: 'error', message: `Không tìm thấy sản phẩm với mã SKU: ${sku}` });
    }
    // Lấy tổng tồn kho còn hạn sử dụng
    const { data: stock } = await supabase
      .from('inventory_batches')
      .select('current_quantity')
      .eq('product_id', product.id)
      .eq('status', 'active')
      .gte('expiry_date', new Date().toISOString().split('T')[0]);
    const totalStock = stock?.reduce((sum, b) => sum + b.current_quantity, 0) || 0;
    res.json({ status: 'success', product: { ...product, stock_quantity: totalStock } });
  } catch (err) {
    next(err);
  }
};

// [GET] /api/products/barcode/:barcode - Tìm sản phẩm bằng mã Barcode/SKU (POS quét barcode/QR)
exports.getProductByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    const { data: product, error } = await supabase
      .from('products')
      .select(`*, categories(name), warehouse_locations(code, name)`)
      .eq('sku', barcode)
      .eq('is_active', true)
      .single();
    if (error || !product) {
      return res.status(404).json({ status: 'error', message: `Không tìm thấy sản phẩm với mã Barcode/SKU: ${barcode}` });
    }
    const { data: stock } = await supabase
      .from('inventory_batches')
      .select('current_quantity')
      .eq('product_id', product.id)
      .eq('status', 'active')
      .gte('expiry_date', new Date().toISOString().split('T')[0]);
    const totalStock = stock?.reduce((sum, b) => sum + b.current_quantity, 0) || 0;
    res.json({ status: 'success', product: { ...product, stock_quantity: totalStock } });
  } catch (err) {
    next(err);
  }
};
