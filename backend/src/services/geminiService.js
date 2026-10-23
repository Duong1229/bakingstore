const ai = require('../config/gemini');

/**
 * Gemini AI Service
 * Tích hợp Google Gemini để tư vấn công thức làm bánh,
 * giải đáp nguyên liệu và tự động map với sản phẩm trong cửa hàng.
 */

// Ưu tiên model nhẹ để phản hồi nhanh. Một số model preview có thể bị Google
// quá tải theo thời điểm, vì vậy luôn có danh sách dự phòng thật thay vì trả
// về một câu trả lời mẫu cho khách.
const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash'
];

/**
 * Gọi Gemini API với cơ chế chuyển model khi server quá tải (503/429).
 *
 * @param {Object} params - Tham số gửi tới Gemini
 * @returns {Promise<Object>} Response từ Gemini
 */
const generateContentWithRetry = async (params) => {
  let lastError;

  for (const model of GEMINI_MODELS) {
    try {
      return await ai.models.generateContent({ ...params, model });
    } catch (error) {
      lastError = error;
      const status = error?.status || error?.error?.code;
      const canTryAnotherModel = [429, 500, 503, 504].includes(status);

      if (!canTryAnotherModel) {
        throw error;
      }

      console.warn(`Gemini model ${model} không sẵn sàng (${status}). Đang chuyển model dự phòng.`);
    }
  }

  throw lastError;
};


/**
 * Tạo System Prompt hướng dẫn Gemini AI đóng vai chuyên gia làm bánh
 *
 * @param {Array} products - Danh sách sản phẩm đang bán tại cửa hàng
 * @returns {string} System instruction prompt
 */
const buildSystemInstruction = (products = []) => {
  const productList =
    products.length > 0
      ? products
        .map(
          p =>
            `- ${p.name} (SKU: ${p.sku}) - ${Number(
              p.price
            ).toLocaleString('vi-VN')}đ/${p.unit}${p.is_combo ? ' [SET COMBO]' : ''
            }`
        )
        .join('\n')
      : 'Danh sách sản phẩm đang cập nhật.';

  return `Bạn là trợ lý AI chuyên gia về làm bánh của cửa hàng "Baking AI Store" - cửa hàng nguyên liệu và dụng cụ làm bánh uy tín tại Việt Nam.

Nhiệm vụ của bạn:

1. Tư vấn công thức làm bánh chi tiết:
   - Nguyên liệu
   - Định lượng theo gam/ml
   - Các bước thực hiện
   - Nhiệt độ và thời gian nướng

2. Trả lời đúng trọng tâm câu hỏi trước. Khi khách hỏi mua, tìm sản phẩm
   hoặc xin đường dẫn, tuyệt đối không nói rằng bạn “không thể gửi link” hay
   “không thể gửi đường dẫn”. Hệ thống sẽ gắn các thẻ sản phẩm có nút
   “Xem sản phẩm” ngay bên dưới câu trả lời. Bạn chỉ cần nói ngắn gọn:
   “Mình đã gửi các sản phẩm phù hợp bên dưới, bạn bấm Xem sản phẩm để mở
   trang chi tiết.” Không tự bịa URL, giá hoặc sản phẩm không có trong dữ liệu.

3. Giải đáp các thắc mắc chuyên môn:
   - Tại sao bánh bị xẹp.
   - Cách đánh bông lòng trắng trứng.
   - Cách bảo quản bột, bơ, kem tươi.
   - Cách thay thế nguyên liệu.

4. Giới thiệu các Set Combo làm bánh sẵn có nếu phù hợp với nhu cầu của khách.

Danh sách sản phẩm hiện có tại cửa hàng Baking AI Store:

${productList}

Phong cách trả lời:
- Thân thiện, chu đáo.
- Dùng emoji làm bánh sinh động 🍰🧁🍞🥖.
- Trả lời bằng tiếng Việt chuẩn.
- Câu trả lời rõ ràng, dễ hiểu và dễ thực hiện.
- Nếu khách hỏi công thức: nêu định lượng thành phẩm, nguyên liệu theo g/ml,
  các bước, nhiệt độ/thời gian và lưu ý. Nếu khách hỏi lỗi làm bánh hoặc bảo
  quản: trả lời nguyên nhân và cách khắc phục trực tiếp, không biến thành công thức.
- Trả lời gọn trong khoảng 250 từ, trừ khi khách chủ động yêu cầu công thức đầy đủ.
`;
};


/**
 * Chat với Gemini AI
 *
 * @param {Object} params
 * @param {string} params.message - Tin nhắn hiện tại của khách hàng
 * @param {Array} params.conversationHistory - Lịch sử hội thoại
 * @param {Array} params.storeProducts - Danh sách sản phẩm cửa hàng
 *
 * @returns {Promise<string>} Nội dung câu trả lời từ AI
 */
exports.chatWithBakingAI = async ({
  message,
  conversationHistory = [],
  storeProducts = []
}) => {
  const systemInstruction =
    buildSystemInstruction(storeProducts);

  // Chuẩn bị context các tin nhắn gần nhất
  const contents = [
    ...conversationHistory.slice(-10).map(msg => ({
      role:
        msg.role === 'assistant'
          ? 'model'
          : msg.role,
      parts: [
        {
          text: msg.content
        }
      ]
    })),

    {
      role: 'user',
      parts: [
        {
          text: message
        }
      ]
    }
  ];

  try {
    const response =
      await generateContentWithRetry({
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 500
        }
      });

    return response.text;
  } catch (error) {
    console.error(
      'Gemini AI Error:',
      error
    );

    // Tất cả model Gemini đều quá tải
    if ([429, 500, 503, 504].includes(error?.status || error?.error?.code)) {
      throw new Error(
        'Dịch vụ AI đang quá tải. Vui lòng thử lại sau ít phút.'
      );
    }

    throw error;
  }
};


/**
 * Gợi ý công thức và nguyên liệu cụ thể cho một loại bánh
 *
 * @param {Object} params
 * @param {string} params.cakeType - Loại bánh
 * @param {Array} params.storeCombos - Danh sách combo
 * @param {Array} params.storeProducts - Danh sách sản phẩm
 *
 * @returns {Promise<Object>}
 * {
 *   cake_type,
 *   recipe,
 *   suggested_combos
 * }
 */
exports.suggestRecipeForCake = async ({
  cakeType,
  storeCombos = [],
  storeProducts = []
}) => {
  const prompt = `Khách hàng muốn làm món bánh: "${cakeType}".

Hãy cung cấp:

1. Giới thiệu ngắn về món bánh này.

2. Công thức chuẩn:
   - Định lượng nguyên liệu chi tiết.
   - Phù hợp cho 4-6 người ăn.

3. Các bước thực hiện:
   - Trình bày từng bước rõ ràng.
   - Nêu nhiệt độ lò.
   - Nêu thời gian nướng.

4. Các lưu ý quan trọng để tránh thất bại.

5. Danh sách nguyên liệu cần chuẩn bị.

6. Nếu có nguyên liệu phù hợp trong danh sách sản phẩm cửa hàng,
hãy ưu tiên gợi ý đúng tên sản phẩm và SKU.`;

  const systemInstruction =
    buildSystemInstruction([
      ...storeCombos,
      ...storeProducts
    ]);

  try {
    const response =
      await generateContentWithRetry({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],

        config: {
          systemInstruction:
            systemInstruction,
          temperature: 0.6,
          maxOutputTokens: 700
        }
      });

    // Tìm các combo phù hợp với loại bánh
    const lowerCake =
      cakeType.toLowerCase();

    const matchedCombos =
      storeCombos.filter(c => {
        const comboName =
          c.name.toLowerCase();

        const normalizedComboName =
          comboName
            .replace(
              'combo làm bánh ',
              ''
            )
            .replace(
              'combo ',
              ''
            );

        return (
          comboName.includes(lowerCake) ||
          lowerCake.includes(
            normalizedComboName
          )
        );
      });

    return {
      cake_type: cakeType,
      recipe: response.text,
      suggested_combos:
        matchedCombos
    };
  } catch (error) {
    console.error(
      'Gemini Recipe Error:',
      error
    );

    // Tất cả model Gemini đều quá tải
    if ([429, 500, 503, 504].includes(error?.status || error?.error?.code)) {
      throw new Error(
        'Dịch vụ AI đang quá tải. Vui lòng thử lại sau ít phút.'
      );
    }

    throw error;
  }
};
