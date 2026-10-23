const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const bannerFile = path.join(__dirname, '../../data/promotional-banners.json');
const defaults = [
  { id: 'banner-cake-20-10', title: 'Quà bánh 20/10', season: 'Ngày Phụ nữ Việt Nam', image_url: '/banners/banh-20-10.png', target_url: '/banner/banner-cake-20-10', story_title: 'Gửi một chiếc bánh, gửi trọn yêu thương', story_content: '20/10 là dịp để gửi lời cảm ơn thật ngọt ngào đến những người phụ nữ bạn yêu quý. Từ một chiếc bánh kem hoa nhỏ xinh đến hộp cupcake tự làm, bạn có thể chuẩn bị món quà mang dấu ấn riêng bằng những nguyên liệu tươi ngon của Tiệm Ốc.', category_id: '10000000-0000-0000-0000-000000000007', sort_order: 1, is_active: true },
  { id: 'banner-ingredients', title: 'Set nguyên liệu tiện lợi', season: 'Mùa bánh mới', image_url: '/banners/nguyen-lieu-troi-xanh.png', target_url: '/banner/banner-ingredients', story_title: 'Một hộp đủ đầy cho mẻ bánh đầu tiên', story_content: 'Chọn set nguyên liệu đã được định lượng sẵn để việc làm bánh nhẹ nhàng và tiện lợi hơn.', category_id: '10000000-0000-0000-0000-000000000005', sort_order: 2, is_active: true },
  { id: 'banner-cookie', title: 'Bánh quy & Cookie', season: 'Mùa cookie', image_url: '/banners/cookie-nang-vang.png', target_url: '/banner/banner-cookie', story_title: 'Mẻ cookie thơm bơ cho những buổi chiều ấm áp', story_content: 'Chọn bột, bơ và chocolate phù hợp để làm ra những chiếc cookie giòn thơm tại nhà.', category_id: '10000000-0000-0000-0000-000000000006', sort_order: 3, is_active: true },
];

async function readBanners() {
  try { return JSON.parse(await fs.readFile(bannerFile, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.mkdir(path.dirname(bannerFile), { recursive: true });
    await fs.writeFile(bannerFile, JSON.stringify(defaults, null, 2), 'utf8');
    return defaults;
  }
}
async function writeBanners(banners) {
  await fs.mkdir(path.dirname(bannerFile), { recursive: true });
  await fs.writeFile(bannerFile, JSON.stringify(banners, null, 2), 'utf8');
}
function normalize(payload, previous = {}) {
  const title = String(payload.title ?? previous.title ?? '').trim();
  const image_url = String(payload.image_url ?? previous.image_url ?? '').trim();
  const target_url = String(payload.target_url ?? previous.target_url ?? '').trim();
  if (!title || !image_url || !target_url) throw Object.assign(new Error('Vui lòng nhập tiêu đề, ảnh banner và đường dẫn khi bấm.'), { status: 400 });
  if (!target_url.startsWith('/')) throw Object.assign(new Error('Đường dẫn banner cần bắt đầu bằng dấu /.'), { status: 400 });
  return { ...previous, title, image_url, target_url, season: String(payload.season ?? previous.season ?? '').trim(), story_title: String(payload.story_title ?? previous.story_title ?? '').trim(), story_content: String(payload.story_content ?? previous.story_content ?? '').trim(), category_id: String(payload.category_id ?? previous.category_id ?? '').trim(), collection_key: String(payload.collection_key ?? previous.collection_key ?? '').trim(), sort_order: Number(payload.sort_order ?? previous.sort_order ?? 0), is_active: payload.is_active === undefined ? (previous.is_active ?? true) : Boolean(payload.is_active) };
}

exports.getPublic = async (req, res, next) => { try { const banners = (await readBanners()).filter(item => item.is_active).sort((a, b) => a.sort_order - b.sort_order); res.json({ status: 'success', banners }); } catch (error) { next(error); } };
exports.getAdmin = async (req, res, next) => { try { const banners = (await readBanners()).sort((a, b) => a.sort_order - b.sort_order); res.json({ status: 'success', banners }); } catch (error) { next(error); } };
exports.create = async (req, res, next) => { try { const banners = await readBanners(); const id = randomUUID(); const target_url = !req.body.target_url || req.body.target_url === '/banner/' ? `/banner/${id}` : req.body.target_url; const banner = { id, ...normalize({ ...req.body, target_url }), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; banners.push(banner); await writeBanners(banners); res.status(201).json({ status: 'success', banner }); } catch (error) { next(error); } };
exports.update = async (req, res, next) => { try { const banners = await readBanners(); const index = banners.findIndex(item => item.id === req.params.id); if (index < 0) return res.status(404).json({ status: 'error', message: 'Không tìm thấy banner.' }); const banner = { ...normalize(req.body, banners[index]), updated_at: new Date().toISOString() }; banners[index] = banner; await writeBanners(banners); res.json({ status: 'success', banner }); } catch (error) { next(error); } };
exports.remove = async (req, res, next) => { try { const banners = await readBanners(); const nextBanners = banners.filter(item => item.id !== req.params.id); if (nextBanners.length === banners.length) return res.status(404).json({ status: 'error', message: 'Không tìm thấy banner.' }); await writeBanners(nextBanners); res.json({ status: 'success', message: 'Đã xóa banner.' }); } catch (error) { next(error); } };
