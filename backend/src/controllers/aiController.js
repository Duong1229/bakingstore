const supabase = require('../config/supabase');
const geminiService = require('../services/geminiService');
const offlineCatalog = require('../data/offlineCatalog');
const normalize = (value = '') => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// Không để câu trả lời tạo sinh phủ định khả năng xem sản phẩm trong khi giao
// diện thực tế đang hiển thị thẻ "Xem sản phẩm" ngay bên dưới nó.
const removeFalseLinkDisclaimer = (reply = '') => String(reply)
  .replace(/(?:dạ,?\s*)?[^.!?\n]{0,100}(?:không thể|không có khả năng)[^.!?\n]{0,120}(?:gửi|cung cấp)[^.!?\n]{0,100}(?:đường dẫn|link)[^.!?\n]*[.!?]?/gi, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();
const recipeBook = [
  { keys: ['tiramisu'], title: 'Tiramisu không cần lò nướng', portion: '1 khuôn 18 cm (6–8 phần)', formula: ['Mascarpone: 250 g', 'Whipping cream lạnh: 250 ml', 'Bánh ladyfinger: 180 g', 'Cà phê đen nguội: 120 ml', 'Đường: 50 g', 'Bột cacao: 10 g'], steps: 'Đánh bông kem lạnh với đường; trộn nhẹ cùng mascarpone. Nhúng nhanh bánh quy qua cà phê, xếp xen kẽ kem rồi ủ lạnh 4–6 giờ.', ingredients: ['mascarpone', 'whipping', 'kem', 'cacao'] },
  { keys: ['bong lan', 'gato'], title: 'Bánh bông lan cơ bản', portion: '1 khuôn tròn 18 cm (6 phần)', formula: ['Trứng gà: 3 quả (khoảng 150 g không vỏ)', 'Đường: 90 g', 'Bột mì đa dụng: 90 g', 'Sữa tươi: 30 ml', 'Dầu ăn: 30 ml', 'Bột nở: 3 g (tùy chọn)'], steps: 'Đánh trứng với đường đến bông đặc, rây bột vào và trộn nhẹ. Trộn sữa/dầu, nướng 160–170°C khoảng 30–35 phút.', ingredients: ['bot', 'men', 'baking'] },
  { keys: ['cookie', 'banh quy'], title: 'Cookie bơ cơ bản', portion: '12–15 chiếc cookie vừa', formula: ['Bột mì: 180 g', 'Bơ lạt mềm: 100 g', 'Đường: 80 g', 'Trứng gà: 1 quả', 'Vanilla: 3 ml', 'Chocolate chip: 80 g (tùy chọn)'], steps: 'Đánh bơ với đường, cho trứng và vanilla. Trộn bột vừa đủ, tạo hình. Nướng 165°C trong 12–15 phút.', ingredients: ['bot', 'bo', 'vanilla', 'chocolate'] },
  { keys: ['hoa cuc'], title: 'Bánh mì hoa cúc', portion: '1 ổ lớn khoảng 750–800 g sau khi nướng', formula: ['Bột mì làm bánh mì: 500 g', 'Men instant: 7 g', 'Đường: 70 g', 'Sữa tươi lạnh: 120 ml', 'Trứng gà: 2 quả (khoảng 100 g không vỏ)', 'Bơ lạt: 100 g', 'Muối: 5 g'], steps: 'Nhào bột, men, đường, trứng và sữa đến khi kéo màng mỏng; cho bơ và muối vào nhào tiếp. Ủ nở, tạo thừng tóc, quét trứng rồi nướng 170°C trong 25–30 phút.', ingredients: ['bot', 'men', 'bo', 'sua'] },
  { keys: ['banh mi'], title: 'Bánh mì cơ bản', portion: '4 ổ nhỏ, mỗi ổ khoảng 100 g', formula: ['Bột mì làm bánh mì: 400 g', 'Men instant: 6 g', 'Nước lạnh: 260 ml', 'Đường: 8 g', 'Muối: 7 g', 'Dầu ăn: 15 ml'], steps: 'Nhào bột đến mịn, ủ nở gấp đôi, chia bột và tạo hình. Ủ lần hai rồi nướng 180°C trong 18–22 phút.', ingredients: ['bot', 'men'] },
];

const getProductSuggestions = (products, message, recipe) => {
  const query = normalize(message);
  const ignored = new Set(['banh', 'lam', 'cach', 'dung', 'cho', 'voi', 'toi', 'muon', 'sau', 'nhu', 'nao', 'cong', 'thuc']);
  const inferredTokens = [];
  const intentHints = [
    { when: ['tiramisu'], terms: ['tiramisu', 'mascarpone', 'whipping', 'sampa', 'cacao'] },
    { when: ['cookie', 'banh quy'], terms: ['cookie', 'chocolate', 'bot mi', 'bo lat', 'vani'] },
    { when: ['brownie'], terms: ['brownie', 'chocolate', 'cacao', 'bot mi', 'bo lat'] },
    { when: ['cupcake'], terms: ['cupcake', 'bot mi', 'bo lat', 'vani', 'whipping'] },
    { when: ['bong lan'], terms: ['bong lan', 'bot mi', 'bot no', 'vani'] },
    { when: ['banh mi'], terms: ['banh mi', 'bot mi', 'men no'] }
  ];
  intentHints.forEach(hint => {
    if (hint.when.some(phrase => query.includes(phrase))) inferredTokens.push(...hint.terms);
  });
  const tokens = [...new Set([
    ...(recipe?.ingredients || query.split(/[^a-z0-9]+/)),
    ...inferredTokens.flatMap(term => normalize(term).split(/[^a-z0-9]+/))
  ])].filter(token => token.length > 2 && !ignored.has(token));
  const scored = products.map(product => {
    const haystack = normalize(`${product.name} ${product.sku} ${product.description || ''}`);
    return { product, score: tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 2 : 0), 0) + (product.is_combo && query.includes('combo') ? 3 : 0) };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).map(item => item.product);
  // Không bao giờ bù bằng sản phẩm bất kỳ: nếu không khớp, không gợi ý.
  return scored.filter((item, index, list) => list.findIndex(other => other.id === item.id) === index).slice(0, 4);
};

// Chỉ hiện thẻ hàng khi khách thực sự hỏi mua/tìm hàng. “Gợi ý làm cupcake”
// là câu hỏi kiến thức, không phải yêu cầu đẩy danh sách sản phẩm.
const isShoppingRequest = (message) => /\b(mua|dat hang|them vao gio|gia ban|gia cua|tim san pham|tim nguyen lieu|san pham nao co|con hang|combo nao co|link|duong dan|nguyen lieu|dung cu|lam banh|cong thuc|goi y)\b/.test(normalize(message));

const answerUsageQuestion = (message) => {
  const text = normalize(message);
  if (/(thay|thay the).*(chocolate|choco|socola)|chocolate.*thay/.test(text)) {
    if (/chip/.test(text)) return 'Nếu công thức cần chocolate chip, lựa chọn gần nhất là chocolate đen cắt hạt nhỏ với lượng tương đương. Không nên thay hoàn toàn bằng bột cacao vì cacao chỉ tạo vị và màu, không tạo những miếng chocolate chảy trong bánh. Với brownie, bạn có thể dùng chocolate đen thanh 55–70% cắt nhỏ; nếu dùng loại không ngọt, tăng thêm 10–15% đường theo lượng chocolate thay thế.';
    return 'Bạn có thể thay chocolate đen bằng chocolate compound hoặc chocolate thanh 55–70% với lượng tương đương. Nếu chỉ có bột cacao, hãy dùng khoảng 3 phần bột cacao + 1 phần dầu/bơ để bù độ béo, rồi tăng đường một chút vì cacao đắng hơn. Bạn cho mình biết đang làm brownie, cookie hay bánh kem để mình tính đúng lượng nhé.';
  }
  if (/(20\/?10|phu nu viet nam|tang.*(me|co|ban gai|nguoi yeu)|qua tang)/.test(text)) {
    return 'Làm quà 20/10, mình gợi ý bánh có hình thức nhẹ nhàng và dễ tặng: bánh bento kem hoa nhỏ (1–2 người), cupcake trang trí hoa (dễ chia), hoặc tiramisu hộp kèm thiệp. Nếu bạn mới làm, cupcake vani hoặc brownie hộp là dễ thành công nhất; còn muốn nổi bật thì chọn bento kem hoa. Bạn dự định tặng mấy người và có lò nướng không để mình gợi ý công thức, số lượng và nguyên liệu phù hợp?';
  }
  if (/bong lan/.test(text) && /tai sao|bi xep|xep|khong no|that bai|loi/.test(text)) {
    return 'Bánh bông lan bị xẹp thường do một trong các nguyên nhân sau: trứng đánh chưa đủ bông hoặc bị vỡ bọt khi trộn bột; nhiệt lò chưa đủ nóng; mở cửa lò quá sớm; hoặc bánh chưa chín hẳn ở giữa. Bạn hãy làm nóng lò trước 15–20 phút, đánh trứng đến khi nhấc que tạo vệt rõ, rây bột rồi fold nhẹ từ dưới lên, và chỉ mở lò sau ít nhất 25 phút. Khi lấy ra, thử xiên tăm vào giữa bánh: tăm khô mới là bánh chín.';
  }
  const asksStorage = /bao quan|sau khi mo|han su dung|de tu lanh/.test(text);
  if (asksStorage && /whipping|kem sua tuoi|kem tuoi/.test(text)) return 'Whipping cream nên để ngăn mát tủ lạnh 2–6°C, không để đông đá. Sau khi mở hộp, lau sạch miệng hộp, đậy kín và dùng tốt nhất trong 3–5 ngày. Chỉ lấy lượng cần dùng bằng dụng cụ sạch; nếu kem có mùi chua hoặc tách nước bất thường thì không nên dùng.';
  if (asksStorage && /bot mi|bot/.test(text)) return 'Bột mì nên bảo quản trong hũ hoặc túi kín, nơi khô ráo, thoáng mát, tránh nắng và mùi mạnh. Sau khi mở, dùng muỗng khô để lấy bột và nên sử dụng trong 2–3 tháng để chất lượng nở ổn định.';
  if (asksStorage && /men/.test(text)) return 'Men đã mở nên được bọc kín và giữ trong ngăn mát tủ lạnh. Dùng muỗng khô, tránh nước nóng; để men hoạt động tốt, nên dùng trong khoảng 1–2 tháng sau khi mở.';
  if (/cach dung|dung .* nhu the nao|lam gi/.test(text)) return 'Bạn cho mình biết tên sản phẩm hoặc món bánh bạn muốn làm nhé. Mình sẽ hướng dẫn đúng cách dùng, nhiệt độ và định lượng phù hợp.';
  return `Mình hiểu bạn đang hỏi: “${String(message).trim()}”. Bạn cho mình biết thêm bạn đang làm loại bánh nào, có lò nướng không và cần bao nhiêu phần nhé; mình sẽ gợi ý công thức hoặc cách xử lý cụ thể.`;
};

// Khi nhà cung cấp AI bên ngoài chập chờn, chatbot vẫn tư vấn được các tình
// huống làm bánh phổ biến thay vì ném lỗi “AI đang bận” cho khách. Đây là lớp
// dự phòng tại máy, không thay thế Gemini khi dịch vụ hoạt động bình thường.
const buildResilientBakingReply = (message) => {
  const text = normalize(message);
  const isGift = /tang|qua|sinh nhat|ky niem|ban trai|ban gai|me|co giao|phu nu|valentine/.test(text);
  if (isGift) {
    return 'Nếu làm bánh để tặng, bạn có thể chọn theo mức độ dễ làm và cách đóng gói: brownie hoặc cookie là chắc tay, dễ mang đi; cupcake phù hợp khi cần chia nhiều phần; còn bánh bento hợp cho một người hoặc hai người. Với người mới, mình khuyên brownie chocolate: vị đậm, ít phải trang trí và bảo quản dễ. Bạn cho mình biết số người nhận, có lò nướng không và muốn ngân sách bao nhiêu để mình chốt công thức cùng nguyên liệu phù hợp.';
  }
  if (/thay|thay the/.test(text)) {
    return 'Để thay nguyên liệu an toàn, cần biết món bánh và nguyên liệu gốc vì mỗi loại có vai trò khác nhau: bột tạo cấu trúc, bơ tạo độ béo, trứng tạo độ nở/liên kết, còn chocolate tạo cả vị lẫn kết cấu. Bạn gửi giúp mình tên nguyên liệu cần thay và lượng trong công thức; mình sẽ tính tỉ lệ thay thế cụ thể để bánh không bị khô hoặc xẹp.';
  }
  if (/bao quan|han su dung|tu lanh|sau khi mo/.test(text)) {
    return 'Nguyên tắc bảo quản cơ bản là: bột, đường và cacao để hũ kín, khô ráo; men mở gói nên bọc kín và giữ ngăn mát; bơ, kem tươi và phô mai luôn bảo quản lạnh theo hướng dẫn trên bao bì. Dùng dụng cụ khô, sạch để lấy nguyên liệu và không dùng tiếp nếu có mùi lạ, mốc hoặc tách nước bất thường. Bạn cho mình tên sản phẩm để mình hướng dẫn nhiệt độ và thời hạn sau mở nắp chính xác.';
  }
  if (/loi|xep|chai|kho|khong no|that bai/.test(text)) {
    return 'Khi bánh bị lỗi, bạn hãy kiểm tra lần lượt: cân nguyên liệu bằng gam; làm nóng lò trước; không đánh/trộn bột quá lâu; dùng đúng nhiệt độ; và chỉ mở cửa lò khi bánh đã ổn định. Bạn mô tả giúp mình bánh bị xẹp, khô, chai hay sống giữa, kèm nhiệt độ/thời gian đã nướng, mình sẽ khoanh đúng nguyên nhân và cách sửa.';
  }
  return 'Mình có thể hỗ trợ công thức, tỉ lệ nguyên liệu, nhiệt độ lò, cách bảo quản hoặc chọn dụng cụ. Bạn đang muốn làm món bánh nào, cho bao nhiêu người và có lò nướng không? Mình sẽ hướng dẫn từng bước phù hợp.';
};

// [POST] /api/ai/chat - Chatbot Gemini AI hỏi công thức làm bánh
exports.chat = async (req, res, next) => {
  try {
    const { message, conversation_history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ status: 'error', message: 'Vui lòng nhập câu hỏi.' });
    }

    // Tư vấn mua hàng phải trả nhanh và chính xác theo dữ liệu cửa hàng,
    // không chờ dịch vụ tạo sinh bên ngoài.
    let products = [];
    if (offlineCatalog.shouldUseOffline()) {
      products = offlineCatalog.products;
    } else {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug, sku, price, unit, description, image_url, is_combo')
          .eq('is_active', true)
          .order('is_combo', { ascending: false })
          .limit(30);
        if (error) throw error;
        products = data || [];
      } catch (productError) {
        if (!offlineCatalog.isConnectionFailure(productError)) throw productError;
        offlineCatalog.markDatabaseUnavailable();
        products = offlineCatalog.products;
      }
    }

    // AI tạo sinh luôn là nguồn trả lời chính. Từ khóa chỉ dùng cho phần gợi ý
    // mua sắm phía dưới, không được phép thay thế câu trả lời của AI.
    const shouldSuggestProducts = isShoppingRequest(message);
    let aiReply;
    try {
      if (!process.env.GEMINI_API_KEY) throw new Error('AI_NOT_CONFIGURED');
      aiReply = await Promise.race([
        // Chỉ gửi câu hỏi và ngữ cảnh hội thoại do khách nhập; không gửi danh
        // sách sản phẩm/nội bộ của cửa hàng ra dịch vụ AI.
        geminiService.chatWithBakingAI({ message, conversationHistory: conversation_history, storeProducts: [] }),
        // Cho phép model dự phòng hoàn tất; trước đây mốc 12 giây làm hủy
        // yêu cầu trong lúc Gemini vừa chuyển model sau một đợt quá tải.
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI_TIMEOUT')), 30000)),
      ]);
    } catch (aiError) {
      console.error('AI tư vấn không phản hồi:', aiError.message);
      aiReply = buildResilientBakingReply(message);
    }

    // Ghép sản phẩm sau khi AI trả lời để có cả nguyên liệu AI vừa đề cập
    // trong công thức. Ví dụ “làm cupcake” sẽ dẫn đúng bột, bơ, vani…
    // thay vì chỉ hoạt động khi khách gõ chính xác tên sản phẩm.
    aiReply = removeFalseLinkDisclaimer(aiReply);
    const suggestedProducts = shouldSuggestProducts
      ? getProductSuggestions(products, `${message} ${aiReply}`)
      : [];

    res.json({
      status: 'success',
      reply: aiReply,
      products: suggestedProducts,
      product_intro: shouldSuggestProducts && suggestedProducts.length ? 'Mình đã gửi các sản phẩm phù hợp bên dưới. Bạn bấm “Xem sản phẩm” để mở trang chi tiết, hoặc “+ Giỏ hàng” để thêm ngay:' : null,
      message_sent: message
    });
  } catch (err) {
    console.error('Gemini AI Error:', err);
    next(err);
  }
};

// [POST] /api/ai/suggest-recipe - Gợi ý combo/nguyên liệu dựa trên loại bánh muốn làm
exports.suggestRecipe = async (req, res, next) => {
  try {
    const { cake_type } = req.body;
    if (!cake_type) {
      return res.status(400).json({ status: 'error', message: 'Vui lòng nhập tên loại bánh muốn làm.' });
    }

    let allProducts = offlineCatalog.shouldUseOffline() ? offlineCatalog.products : null;
    if (!allProducts) {
      try {
        const { data, error } = await supabase.from('products').select('id, name, sku, price, unit, image_url, description, is_combo').eq('is_active', true).limit(30);
        if (error) throw error;
        allProducts = data || [];
      } catch (productError) {
        if (!offlineCatalog.isConnectionFailure(productError)) throw productError;
        offlineCatalog.markDatabaseUnavailable();
        allProducts = offlineCatalog.products;
      }
    }
    const combos = allProducts.filter(product => product.is_combo);
    const products = allProducts.filter(product => !product.is_combo);

    const normalizedCake = normalize(cake_type);
    const localRecipe = recipeBook.find(item => item.keys.some(key => normalizedCake.includes(key)));
    if (!process.env.GEMINI_API_KEY) {
      const recipe = localRecipe
        ? `Công thức ${localRecipe.title}\nĐịnh lượng: ${localRecipe.portion}\n\nNguyên liệu:\n${localRecipe.formula.map(item => `• ${item}`).join('\n')}\n\nCách làm:\n${localRecipe.steps}`
        : answerUsageQuestion(`cách dùng ${cake_type}`);
      return res.json({ status: 'success', cake_type, recipe, suggested_combos: getProductSuggestions(combos, cake_type, localRecipe) });
    }

    const result = await geminiService.suggestRecipeForCake({
      cakeType: cake_type,
      storeCombos: combos,
      storeProducts: products
    });

    res.json({
      status: 'success',
      cake_type,
      recipe: result.recipe,
      suggested_combos: result.suggested_combos
    });
  } catch (err) {
    console.error('Gemini Suggest Recipe Error:', err);
    next(err);
  }
};
