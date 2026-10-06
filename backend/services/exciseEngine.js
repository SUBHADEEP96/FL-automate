/**
 * West Bengal Excise Calculation Engine (Bengal Excise Act, 1909 & WBSBCL Rules)
 * 
 * Rules:
 * - 1 London Proof Spirit (L.P.) = 57.12% v/v ethyl alcohol at 60°F (51.28% by weight)
 * - Bulk Litres (BL) = (Number of Bottles * Pack Size in ml) / 1000
 * - London Proof Litres (LPL) = Bulk Litres * (Alcohol % / 57.12)
 * - Stock Discrepancy = Physical Counter Stock - (Opening + Inward - Sales - Breakage)
 */

/**
 * Calculates Bulk Litres (BL) for a given bottle count and pack size.
 * @param {number} bottles 
 * @param {number} packSizeMl 
 * @returns {number}
 */
function calculateBulkLitres(bottles, packSizeMl) {
  if (!bottles || bottles <= 0 || !packSizeMl) return 0;
  return Number(((bottles * packSizeMl) / 1000).toFixed(4));
}

/**
 * Calculates London Proof Litres (LPL) for a given bulk litre and strength.
 * Formula: LPL = BL * (Alcohol Strength % / 57.12)
 * @param {number} bulkLitres 
 * @param {number} strengthPct 
 * @returns {number}
 */
function calculateLondonProofLitres(bulkLitres, strengthPct) {
  if (!bulkLitres || bulkLitres <= 0 || !strengthPct) return 0;
  const lpl = bulkLitres * (strengthPct / 57.12);
  return Number(lpl.toFixed(4));
}

/**
 * Computes end-of-day reconciliation for a single product item.
 * @param {object} item { opening, inward, sales, breakage, physicalCount, packSizeMl, strengthPct, mrp }
 * @returns {object}
 */
function computeItemDSR(item) {
  const opening = Number(item.opening || 0);
  const inward = Number(item.inward || 0);
  const sales = Number(item.sales || 0);
  const breakage = Number(item.breakage || 0);
  
  const expectedClosing = opening + inward - sales - breakage;
  const physicalClosing = item.physicalCount !== undefined && item.physicalCount !== null 
    ? Number(item.physicalCount) 
    : expectedClosing;
  
  const discrepancy = physicalClosing - expectedClosing;
  const salesBL = calculateBulkLitres(sales, item.packSizeMl);
  const salesLPL = calculateLondonProofLitres(salesBL, item.strengthPct);
  
  const closingBL = calculateBulkLitres(physicalClosing, item.packSizeMl);
  const closingLPL = calculateLondonProofLitres(closingBL, item.strengthPct);

  const salesValue = Number((sales * item.mrp).toFixed(2));

  return {
    opening,
    inward,
    sales,
    breakage,
    expectedClosing,
    physicalClosing,
    discrepancy,
    salesBL,
    salesLPL,
    closingBL,
    closingLPL,
    salesValue
  };
}

/**
 * Computes day-close summaries across all products.
 * Groups by Category (IMFL, Beer, Wine, CS) and Pack Size.
 * @param {Array} productRows 
 * @returns {object}
 */
function computeDSRSummary(productRows) {
  let totalOpeningBottles = 0;
  let totalInwardBottles = 0;
  let totalSalesBottles = 0;
  let totalBreakageBottles = 0;
  let totalClosingBottles = 0;
  let totalSalesBL = 0;
  let totalSalesLPL = 0;
  let totalClosingBL = 0;
  let totalClosingLPL = 0;
  let totalSalesValue = 0;
  let discrepancyCount = 0;

  const categoryBreakdown = {
    IMFL: { bottlesSold: 0, salesValue: 0, bl: 0, lpl: 0, closingBottles: 0 },
    Beer: { bottlesSold: 0, salesValue: 0, bl: 0, lpl: 0, closingBottles: 0 },
    Wine: { bottlesSold: 0, salesValue: 0, bl: 0, lpl: 0, closingBottles: 0 },
    CS:   { bottlesSold: 0, salesValue: 0, bl: 0, lpl: 0, closingBottles: 0 }
  };

  const sizeBreakdown = {};

  const evaluatedItems = productRows.map(row => {
    const dsr = computeItemDSR(row);
    
    totalOpeningBottles += dsr.opening;
    totalInwardBottles += dsr.inward;
    totalSalesBottles += dsr.sales;
    totalBreakageBottles += dsr.breakage;
    totalClosingBottles += dsr.physicalClosing;
    totalSalesBL += dsr.salesBL;
    totalSalesLPL += dsr.salesLPL;
    totalClosingBL += dsr.closingBL;
    totalClosingLPL += dsr.closingLPL;
    totalSalesValue += dsr.salesValue;

    if (dsr.discrepancy !== 0) {
      discrepancyCount++;
    }

    // Category aggregation
    const cat = row.category || 'IMFL';
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { bottlesSold: 0, salesValue: 0, bl: 0, lpl: 0, closingBottles: 0 };
    }
    categoryBreakdown[cat].bottlesSold += dsr.sales;
    categoryBreakdown[cat].salesValue += dsr.salesValue;
    categoryBreakdown[cat].bl += dsr.salesBL;
    categoryBreakdown[cat].lpl += dsr.salesLPL;
    categoryBreakdown[cat].closingBottles += dsr.physicalClosing;

    // Size aggregation
    const sizeKey = `${row.packSizeMl}ml`;
    if (!sizeBreakdown[sizeKey]) {
      sizeBreakdown[sizeKey] = { sizeMl: row.packSizeMl, bottlesSold: 0, bl: 0, lpl: 0, salesValue: 0 };
    }
    sizeBreakdown[sizeKey].bottlesSold += dsr.sales;
    sizeBreakdown[sizeKey].bl += dsr.salesBL;
    sizeBreakdown[sizeKey].lpl += dsr.salesLPL;
    sizeBreakdown[sizeKey].salesValue += dsr.salesValue;

    return {
      ...row,
      ...dsr
    };
  });

  // Round summary figures to 2 or 4 decimal places
  for (const cat in categoryBreakdown) {
    categoryBreakdown[cat].bl = Number(categoryBreakdown[cat].bl.toFixed(4));
    categoryBreakdown[cat].lpl = Number(categoryBreakdown[cat].lpl.toFixed(4));
    categoryBreakdown[cat].salesValue = Number(categoryBreakdown[cat].salesValue.toFixed(2));
  }

  for (const size in sizeBreakdown) {
    sizeBreakdown[size].bl = Number(sizeBreakdown[size].bl.toFixed(4));
    sizeBreakdown[size].lpl = Number(sizeBreakdown[size].lpl.toFixed(4));
    sizeBreakdown[size].salesValue = Number(sizeBreakdown[size].salesValue.toFixed(2));
  }

  return {
    items: evaluatedItems,
    totals: {
      totalOpeningBottles,
      totalInwardBottles,
      totalSalesBottles,
      totalBreakageBottles,
      totalClosingBottles,
      totalSalesBL: Number(totalSalesBL.toFixed(4)),
      totalSalesLPL: Number(totalSalesLPL.toFixed(4)),
      totalClosingBL: Number(totalClosingBL.toFixed(4)),
      totalClosingLPL: Number(totalClosingLPL.toFixed(4)),
      totalSalesValue: Number(totalSalesValue.toFixed(2)),
      discrepancyCount
    },
    categoryBreakdown,
    sizeBreakdown
  };
}

module.exports = {
  calculateBulkLitres,
  calculateLondonProofLitres,
  computeItemDSR,
  computeDSRSummary
};
