const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const formatDateTime = (date = new Date()) => new Date(date).toLocaleString('vi-VN');
const fontPath = 'C:\\Windows\\Fonts\\arial.ttf';

exports.generateExcel = async ({ documentCode, items, issuedBy, note }) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Phieu_xuat_tieu_huy');
  sheet.mergeCells('A1:G1');
  sheet.getCell('A1').value = 'PHIẾU XUẤT KHO - TIÊU HỦY HÀNG HẾT HẠN';
  sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').alignment = { horizontal: 'center' };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB42318' } };
  sheet.mergeCells('A2:G2'); sheet.getCell('A2').value = `Mã phiếu: ${documentCode}  |  Lý do: Tiêu hủy hàng hết hạn`;
  sheet.mergeCells('A3:G3'); sheet.getCell('A3').value = `Người lập: ${issuedBy || 'Quản trị viên'}  |  Thời gian: ${formatDateTime()}`;
  sheet.mergeCells('A4:G4'); sheet.getCell('A4').value = `Ghi chú: ${note || 'Không có'}`;
  sheet.addRow([]);
  const header = sheet.addRow(['STT', 'SKU', 'Sản phẩm', 'Mã lô', 'Hạn sử dụng', 'Số lượng tiêu hủy', 'Đơn vị']);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7F1D1D' } };
  header.alignment = { horizontal: 'center', vertical: 'middle' };
  items.forEach((item, index) => sheet.addRow([index + 1, item.sku || '-', item.name || '-', item.batch_code, item.expiry_date, item.quantity, item.unit || '-']));
  const total = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalRow = sheet.addRow(['', '', '', '', 'Tổng số lượng', total, '']);
  totalRow.font = { bold: true };
  sheet.addRow([]); sheet.mergeCells(`A${sheet.rowCount + 1}:G${sheet.rowCount + 1}`); sheet.getRow(sheet.rowCount).getCell(1).value = 'Người lập phiếu                                      Người kiểm tra                                      Người phê duyệt';
  sheet.columns = [{ width: 8 }, { width: 18 }, { width: 34 }, { width: 22 }, { width: 17 }, { width: 22 }, { width: 12 }];
  sheet.eachRow((row, number) => { row.alignment = { vertical: 'middle', wrapText: true }; if (number >= 6) row.border = { top: { style: 'thin', color: { argb: 'FFD1D5DB' } }, left: { style: 'thin', color: { argb: 'FFD1D5DB' } }, bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }, right: { style: 'thin', color: { argb: 'FFD1D5DB' } } }; });
  return workbook.xlsx.writeBuffer();
};

exports.generatePdf = ({ documentCode, items, issuedBy, note }) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', margin: 42 }); const chunks = [];
  doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
  if (fs.existsSync(fontPath)) doc.font(fontPath);
  doc.fontSize(16).fillColor('#9F1239').text('PHIẾU XUẤT KHO - TIÊU HỦY HÀNG HẾT HẠN', { align: 'center' });
  doc.moveDown(.4).fontSize(10).fillColor('#333').text(`Mã phiếu: ${documentCode}`).text(`Thời gian lập: ${formatDateTime()}`).text(`Người lập: ${issuedBy || 'Quản trị viên'}`).text('Lý do xuất: Tiêu hủy hàng hết hạn').text(`Ghi chú: ${note || 'Không có'}`);
  doc.moveDown(); const columns = [34, 85, 170, 88, 68, 68]; const x = 42; let y = doc.y;
  const drawHeader = () => { doc.rect(x, y, 511, 22).fill('#7F1D1D'); doc.fillColor('white').fontSize(8); ['STT', 'SKU', 'Sản phẩm / Mã lô', 'Hạn dùng', 'SL hủy', 'Đơn vị'].forEach((label, i) => doc.text(label, x + columns.slice(0, i).reduce((a, b) => a + b, 0) + 4, y + 7, { width: columns[i] - 8, align: i === 2 ? 'left' : 'center' })); y += 22; };
  drawHeader(); doc.fillColor('#222').fontSize(8);
  items.forEach((item, index) => { const rowHeight = 34; if (y + rowHeight > 755) { doc.addPage(); y = 42; drawHeader(); doc.fillColor('#222').fontSize(8); } const values = [String(index + 1), item.sku || '-', `${item.name || '-'}\n${item.batch_code}`, item.expiry_date, String(item.quantity), item.unit || '-']; let offset = 0; values.forEach((value, i) => { doc.rect(x + offset, y, columns[i], rowHeight).stroke('#D1D5DB'); doc.text(value, x + offset + 4, y + 7, { width: columns[i] - 8, align: i === 2 ? 'left' : 'center' }); offset += columns[i]; }); y += rowHeight; });
  const total = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0); doc.moveTo(x, y + 8).lineTo(x + 511, y + 8).stroke('#7F1D1D'); doc.fontSize(10).fillColor('#7F1D1D').text(`Tổng số lượng tiêu hủy: ${total}`, x, y + 16, { align: 'right', width: 511 }); doc.fillColor('#333').text('Người lập phiếu                         Người kiểm tra                         Người phê duyệt', x, y + 70, { width: 511, align: 'center' }); doc.end();
});
