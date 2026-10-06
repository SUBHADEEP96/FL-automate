const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

/**
 * Generates an official West Bengal e-Abgari / WBSBCL Daily Return Excel workbook.
 * 
 * @param {object} dsrSummary - Object containing items, totals, categoryBreakdown, sizeBreakdown
 * @param {object} shopSettings - Shop license and retailer information
 * @param {string} dateStr - Date of return (YYYY-MM-DD)
 * @returns {Promise<{ filePath: string, buffer: Buffer }>}
 */
async function generateWbsbclDailyReturnExcel(dsrSummary, shopSettings, dateStr) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'West Bengal FL-OffShop POS Compliance System';
  workbook.lastModifiedBy = shopSettings.retailer_code || 'WBSBCL_RETAILER';
  workbook.created = new Date();
  workbook.modified = new Date();

  // -------------------------------------------------------------
  // Sheet 1: WBSBCL Daily Stock & Sales Register (DSR)
  // -------------------------------------------------------------
  const worksheet = workbook.addWorksheet('WBSBCL_Daily_Return', {
    pageSetup: { orientation: 'landscape', paperSize: 9 }
  });

  // Header Titles
  worksheet.mergeCells('A1:O1');
  worksheet.getCell('A1').value = 'GOVERNMENT OF WEST BENGAL — EXCISE DIRECTORATE';
  worksheet.getCell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E293B' } };
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A2:O2');
  worksheet.getCell('A2').value = 'WEST BENGAL STATE BEVERAGES CORPORATION LTD. (WBSBCL) — DAILY SALES & STOCK STATEMENT';
  worksheet.getCell('A2').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F766E' } };
  worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  // Metadata block
  worksheet.getCell('A4').value = 'Retailer Code:';
  worksheet.getCell('B4').value = shopSettings.retailer_code || 'N/A';
  worksheet.getCell('D4').value = 'License No:';
  worksheet.getCell('E4').value = shopSettings.license_no || 'N/A';
  worksheet.getCell('H4').value = 'Date of Return:';
  worksheet.getCell('I4').value = dateStr;

  worksheet.getCell('A5').value = 'Shop Name:';
  worksheet.getCell('B5').value = shopSettings.shop_name || 'N/A';
  worksheet.getCell('D5').value = 'Excise Range:';
  worksheet.getCell('E5').value = shopSettings.excise_range || 'N/A';
  worksheet.getCell('H5').value = 'District:';
  worksheet.getCell('I5').value = shopSettings.district || 'N/A';

  ['A4', 'D4', 'H4', 'A5', 'D5', 'H5'].forEach(cell => {
    worksheet.getCell(cell).font = { bold: true, color: { argb: 'FF334155' } };
  });

  // Table Column Headers
  const headers = [
    'Sl.', 'SKU Code', 'Brand Name', 'Category', 'Pack (ml)', 'Strength (% v/v)',
    'Opening (Btls)', 'Inward (Btls)', 'Sales (Btls)', 'Breakage (Btls)',
    'Closing (Btls)', 'MRP (₹)', 'Turnover (₹)', 'Total BL', 'Total LPL'
  ];

  const headerRow = worksheet.getRow(7);
  headerRow.values = headers;
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' } // Deep slate
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Populate Item Rows
  let currentRowIdx = 8;
  dsrSummary.items.forEach((item, index) => {
    const row = worksheet.getRow(currentRowIdx);
    row.values = [
      index + 1,
      item.code,
      item.name,
      item.category,
      item.packSizeMl,
      item.strengthPct,
      item.opening,
      item.inward,
      item.sales,
      item.breakage,
      item.physicalClosing,
      item.mrp,
      item.salesValue,
      item.salesBL,
      item.salesLPL
    ];

    // Zebra striping
    const isEven = index % 2 === 0;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (!isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        };
      }

      // Column specific alignments
      if (colNumber === 1 || colNumber === 4) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber === 2 || colNumber === 3) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }

      // Number formatting
      if (colNumber === 12 || colNumber === 13) {
        cell.numFmt = '#,##0.00';
      } else if (colNumber === 14 || colNumber === 15) {
        cell.numFmt = '0.0000';
      }
    });

    currentRowIdx++;
  });

  // Totals Row
  const totalRow = worksheet.getRow(currentRowIdx);
  totalRow.values = [
    '',
    'TOTALS',
    '',
    '',
    '',
    '',
    dsrSummary.totals.totalOpeningBottles,
    dsrSummary.totals.totalInwardBottles,
    dsrSummary.totals.totalSalesBottles,
    dsrSummary.totals.totalBreakageBottles,
    dsrSummary.totals.totalClosingBottles,
    '',
    dsrSummary.totals.totalSalesValue,
    dsrSummary.totals.totalSalesBL,
    dsrSummary.totals.totalSalesLPL
  ];

  totalRow.height = 22;
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF0F172A' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }
    };
    cell.border = {
      top: { style: 'medium' },
      bottom: { style: 'double' }
    };
    if (colNumber >= 7) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    if (colNumber === 13) cell.numFmt = '₹#,##0.00';
    if (colNumber === 14 || colNumber === 15) cell.numFmt = '0.0000';
  });

  // Adjust column widths
  worksheet.columns = [
    { width: 5 },  // Sl
    { width: 16 }, // Code
    { width: 34 }, // Name
    { width: 10 }, // Category
    { width: 10 }, // Pack
    { width: 14 }, // Strength
    { width: 14 }, // Opening
    { width: 13 }, // Inward
    { width: 12 }, // Sales
    { width: 14 }, // Breakage
    { width: 13 }, // Closing
    { width: 11 }, // MRP
    { width: 15 }, // Turnover
    { width: 13 }, // BL
    { width: 13 }  // LPL
  ];

  // -------------------------------------------------------------
  // Sheet 2: Category & Excise Duty Summary
  // -------------------------------------------------------------
  const summarySheet = workbook.addWorksheet('Excise_Category_Summary');

  summarySheet.mergeCells('A1:F1');
  summarySheet.getCell('A1').value = 'WEST BENGAL EXCISE COMPLIANCE SUMMARY (CATEGORY & SIZE)';
  summarySheet.getCell('A1').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1E293B' } };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };

  summarySheet.getRow(3).values = ['Category', 'Bottles Sold', 'Closing Stock', 'Bulk Litres (BL)', 'London Proof Litres (LPL)', 'Turnover (₹)'];
  summarySheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(3).eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  });

  let sRow = 4;
  for (const [catName, catData] of Object.entries(dsrSummary.categoryBreakdown)) {
    summarySheet.getRow(sRow).values = [
      catName,
      catData.bottlesSold,
      catData.closingBottles,
      catData.bl,
      catData.lpl,
      catData.salesValue
    ];
    summarySheet.getRow(sRow).getCell(4).numFmt = '0.0000';
    summarySheet.getRow(sRow).getCell(5).numFmt = '0.0000';
    summarySheet.getRow(sRow).getCell(6).numFmt = '₹#,##0.00';
    sRow++;
  }

  // Statutory Undertaking
  sRow += 3;
  summarySheet.getCell(`A${sRow}`).value = 'STATUTORY DECLARATION UNDER BENGAL EXCISE ACT, 1909:';
  summarySheet.getCell(`A${sRow}`).font = { bold: true };
  sRow++;
  summarySheet.getCell(`A${sRow}`).value = 'I hereby declare that the particulars given above are true and correct representations of sales and closing balances at the licensed premises.';
  summarySheet.getCell(`A${sRow}`).font = { italic: true, size: 9 };
  sRow += 3;
  summarySheet.getCell(`B${sRow}`).value = '_____________________________________';
  summarySheet.getCell(`E${sRow}`).value = '_____________________________________';
  sRow++;
  summarySheet.getCell(`B${sRow}`).value = 'Signature of Authorized Licensee / Manager';
  summarySheet.getCell(`E${sRow}`).value = 'Excise Officer / Inspector in Charge';

  summarySheet.columns = [
    { width: 18 }, { width: 16 }, { width: 16 }, { width: 18 }, { width: 24 }, { width: 18 }
  ];

  // Save to disk and return
  const exportDir = path.join(__dirname, '..', 'data', 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const filename = `WBSBCL_DSR_${shopSettings.retailer_code || 'RET'}_${dateStr}.xlsx`;
  const filePath = path.join(exportDir, filename);

  const buffer = await workbook.xlsx.writeBuffer();
  fs.writeFileSync(filePath, Buffer.from(buffer));

  return { filePath, filename, buffer };
}

module.exports = {
  generateWbsbclDailyReturnExcel
};
