const db = require('./database');

function seedDatabase() {
  console.log('[Seed] Seeding database with authentic West Bengal Excise data...');

  // 1. Shop Settings
  const checkSettings = db.prepare('SELECT id FROM shop_settings WHERE id = 1').get();
  if (!checkSettings) {
    db.prepare(`
      INSERT INTO shop_settings (
        id, shop_name, license_no, licensee_name, district, excise_range, address, gstin,
        retailer_code, portal_username, portal_password, portal_url, auto_submit_enabled,
        printer_width_mm, footer_message
      ) VALUES (
        1,
        'NEW SHYAMBAZAR FL OFF SHOP',
        'WB/EX/FL/KOL-NORTH/0492/2024-25',
        'M/s Ghosh & Banerjee Enterprises',
        'Kolkata North',
        'Cossipore - Shyambazar Range',
        '142/A, Bidhan Sarani, Shyambazar 5-Point, Kolkata - 700004',
        '19AAACG1234E1Z8',
        'WBSBCL-RET-KOL-8912',
        'RET_KOL_8912',
        'ExciseWb@2026!',
        'http://localhost:5001/portal-simulator',
        1,
        80,
        'Government of WB Excise Regulated Retail Outlet. Statutory Warning: Alcohol consumption is injurious to health. Be safe - Don''t Drink and Drive.'
      )
    `).run();
    console.log('✓ Shop settings initialized.');
  }

  // 2. Product Master
  const existingProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (existingProducts === 0) {
    const productsData = [
      // Royal Challenge
      { code: 'IMFL-RC-750', ean: '8901234001017', name: 'Royal Challenge Select Premium Whisky (750ml)', category: 'IMFL', sub_category: 'Whisky', pack_size_ml: 750, strength_pct: 42.8, mrp: 780.0, cost_price: 630.0, stock: 48 },
      { code: 'IMFL-RC-375', ean: '8901234001024', name: 'Royal Challenge Select Premium Whisky (375ml)', category: 'IMFL', sub_category: 'Whisky', pack_size_ml: 375, strength_pct: 42.8, mrp: 400.0, cost_price: 325.0, stock: 64 },
      { code: 'IMFL-RC-180', ean: '8901234001031', name: 'Royal Challenge Select Premium Whisky (180ml)', category: 'IMFL', sub_category: 'Whisky', pack_size_ml: 180, strength_pct: 42.8, mrp: 200.0, cost_price: 162.0, stock: 96 },

      // McDowell's No.1
      { code: 'IMFL-MCD-750', ean: '8901234002014', name: "McDowell's No.1 Reserve Whisky (750ml)", category: 'IMFL', sub_category: 'Whisky', pack_size_ml: 750, strength_pct: 42.8, mrp: 620.0, cost_price: 505.0, stock: 60 },
      { code: 'IMFL-MCD-375', ean: '8901234002021', name: "McDowell's No.1 Reserve Whisky (375ml)", category: 'IMFL', sub_category: 'Whisky', pack_size_ml: 375, strength_pct: 42.8, mrp: 320.0, cost_price: 260.0, stock: 72 },
      { code: 'IMFL-MCD-180', ean: '8901234002038', name: "McDowell's No.1 Reserve Whisky (180ml)", category: 'IMFL', sub_category: 'Whisky', pack_size_ml: 180, strength_pct: 42.8, mrp: 160.0, cost_price: 130.0, stock: 120 },

      // Royal Stag
      { code: 'IMFL-RS-750', ean: '8901234003011', name: 'Royal Stag Premier Special Whisky (750ml)', category: 'IMFL', sub_category: 'Whisky', pack_size_ml: 750, strength_pct: 42.8, mrp: 680.0, cost_price: 550.0, stock: 45 },
      { code: 'IMFL-RS-375', ean: '8901234003028', name: 'Royal Stag Premier Special Whisky (375ml)', category: 'IMFL', sub_category: 'Whisky', pack_size_ml: 375, strength_pct: 42.8, mrp: 350.0, cost_price: 285.0, stock: 50 },
      { code: 'IMFL-RS-180', ean: '8901234003035', name: 'Royal Stag Premier Special Whisky (180ml)', category: 'IMFL', sub_category: 'Whisky', pack_size_ml: 180, strength_pct: 42.8, mrp: 180.0, cost_price: 145.0, stock: 80 },

      // Blenders Pride
      { code: 'IMFL-BP-750', ean: '8901234004018', name: 'Blenders Pride Rare Premium Whisky (750ml)', category: 'IMFL', sub_category: 'Whisky', pack_size_ml: 750, strength_pct: 42.8, mrp: 920.0, cost_price: 745.0, stock: 36 },
      { code: 'IMFL-BP-375', ean: '8901234004025', name: 'Blenders Pride Rare Premium Whisky (375ml)', category: 'IMFL', sub_category: 'Whisky', pack_size_ml: 375, strength_pct: 42.8, mrp: 470.0, cost_price: 380.0, stock: 40 },
      { code: 'IMFL-BP-180', ean: '8901234004032', name: 'Blenders Pride Rare Premium Whisky (180ml)', category: 'IMFL', sub_category: 'Whisky', pack_size_ml: 180, strength_pct: 42.8, mrp: 240.0, cost_price: 195.0, stock: 60 },

      // Antiquity Blue
      { code: 'IMFL-ANT-750', ean: '8901234005015', name: 'Antiquity Blue Ultra Premium Whisky (750ml)', category: 'IMFL', sub_category: 'Whisky', pack_size_ml: 750, strength_pct: 42.8, mrp: 1150.0, cost_price: 935.0, stock: 24 },

      // Old Monk Rum
      { code: 'IMFL-OM-750', ean: '8901234006012', name: 'Old Monk XXX Very Old Vatted Rum (750ml)', category: 'IMFL', sub_category: 'Rum', pack_size_ml: 750, strength_pct: 42.8, mrp: 560.0, cost_price: 450.0, stock: 72 },
      { code: 'IMFL-OM-375', ean: '8901234006029', name: 'Old Monk XXX Very Old Vatted Rum (375ml)', category: 'IMFL', sub_category: 'Rum', pack_size_ml: 375, strength_pct: 42.8, mrp: 290.0, cost_price: 235.0, stock: 60 },
      { code: 'IMFL-OM-180', ean: '8901234006036', name: 'Old Monk XXX Very Old Vatted Rum (180ml)', category: 'IMFL', sub_category: 'Rum', pack_size_ml: 180, strength_pct: 42.8, mrp: 150.0, cost_price: 120.0, stock: 100 },

      // Magic Moments Vodka
      { code: 'IMFL-MM-750', ean: '8901234007019', name: 'Magic Moments Grain Vodka (750ml)', category: 'IMFL', sub_category: 'Vodka', pack_size_ml: 750, strength_pct: 42.8, mrp: 600.0, cost_price: 485.0, stock: 36 },
      { code: 'IMFL-MM-375', ean: '8901234007026', name: 'Magic Moments Grain Vodka (375ml)', category: 'IMFL', sub_category: 'Vodka', pack_size_ml: 375, strength_pct: 42.8, mrp: 310.0, cost_price: 250.0, stock: 40 },

      // Blue Riband Gin
      { code: 'IMFL-BRG-750', ean: '8901234008016', name: 'Blue Riband Extra Dry Gin (750ml)', category: 'IMFL', sub_category: 'Gin', pack_size_ml: 750, strength_pct: 42.8, mrp: 540.0, cost_price: 435.0, stock: 24 },

      // Beer
      { code: 'BEER-KFS-650', ean: '8901234009013', name: 'Kingfisher Strong Premium Beer (650ml Bottle)', category: 'Beer', sub_category: 'Strong Beer', pack_size_ml: 650, strength_pct: 8.0, mrp: 160.0, cost_price: 125.0, stock: 120 },
      { code: 'BEER-KFS-500', ean: '8901234009020', name: 'Kingfisher Strong Beer (500ml Can)', category: 'Beer', sub_category: 'Strong Beer', pack_size_ml: 500, strength_pct: 8.0, mrp: 140.0, cost_price: 110.0, stock: 96 },
      { code: 'BEER-KFL-650', ean: '8901234009037', name: 'Kingfisher Premium Lager Beer (650ml Bottle)', category: 'Beer', sub_category: 'Mild Beer', pack_size_ml: 650, strength_pct: 4.8, mrp: 150.0, cost_price: 118.0, stock: 84 },
      { code: 'BEER-TUB-650', ean: '8901234010019', name: 'Tuborg Strong Premium Beer (650ml Bottle)', category: 'Beer', sub_category: 'Strong Beer', pack_size_ml: 650, strength_pct: 7.8, mrp: 170.0, cost_price: 134.0, stock: 108 },
      { code: 'BEER-BUD-650', ean: '8901234011016', name: 'Budweiser Magnum Strong Beer (650ml Bottle)', category: 'Beer', sub_category: 'Strong Beer', pack_size_ml: 650, strength_pct: 6.5, mrp: 220.0, cost_price: 175.0, stock: 60 },
      { code: 'BEER-BIR-500', ean: '8901234012013', name: 'Bira 91 Boom Super Strong (500ml Can)', category: 'Beer', sub_category: 'Strong Beer', pack_size_ml: 500, strength_pct: 7.5, mrp: 150.0, cost_price: 118.0, stock: 48 },

      // Wine
      { code: 'WINE-SUL-SH-750', ean: '8901234013010', name: 'Sula Shiraz Cabernet Red Wine (750ml)', category: 'Wine', sub_category: 'Red Wine', pack_size_ml: 750, strength_pct: 13.5, mrp: 890.0, cost_price: 710.0, stock: 24 },
      { code: 'WINE-SUL-CH-750', ean: '8901234013027', name: 'Sula Chenin Blanc White Wine (750ml)', category: 'Wine', sub_category: 'White Wine', pack_size_ml: 750, strength_pct: 12.0, mrp: 790.0, cost_price: 630.0, stock: 18 },
      { code: 'WINE-JC-SH-750', ean: '8901234014017', name: "Jacob's Creek Classic Shiraz (750ml)", category: 'Wine', sub_category: 'Imported Wine', pack_size_ml: 750, strength_pct: 13.9, mrp: 1250.0, cost_price: 1010.0, stock: 12 },

      // Country Spirit (CS)
      { code: 'CS-ASMANI-600', ean: '8901234015014', name: 'Bengal Asmani Country Spirit (600ml Bottle)', category: 'CS', sub_category: 'Country Spirit', pack_size_ml: 600, strength_pct: 28.5, mrp: 110.0, cost_price: 88.0, stock: 150 }
    ];

    const insertProduct = db.prepare(`
      INSERT INTO products (code, ean, name, category, sub_category, pack_size_ml, strength_pct, mrp, cost_price, current_stock)
      VALUES (@code, @ean, @name, @category, @sub_category, @pack_size_ml, @strength_pct, @mrp, @cost_price, @stock)
    `);

    const insertHologram = db.prepare(`
      INSERT INTO holograms (serial_number, product_id, batch_no, status)
      VALUES (?, ?, ?, 'IN_STOCK')
    `);

    const insertMany = db.transaction(() => {
      let hologramCounter = 10000;
      for (const prod of productsData) {
        const result = insertProduct.run(prod);
        const productId = result.lastInsertRowid;

        // Generate sample West Bengal 2D DataMatrix Security Holograms for each product in stock
        const hologramsToCreate = Math.min(prod.stock, 5); // seed up to 5 individual serials for instant scanning
        for (let i = 0; i < hologramsToCreate; i++) {
          hologramCounter++;
          const serial = `WB26EX${prod.pack_size_ml}${hologramCounter}`;
          insertHologram.run(serial, productId, `B26-${prod.code.substring(0, 6)}`);
        }
      }
    });

    insertMany();
    console.log(`✓ Seeded ${productsData.length} products and security holograms.`);
  }

  // 3. Seed an Inward Challan for audit trail
  const existingChallans = db.prepare('SELECT COUNT(*) as count FROM inward_challans').get().count;
  if (existingChallans === 0) {
    const today = new Date().toISOString().slice(0, 10);
    const challanStmt = db.prepare(`
      INSERT INTO inward_challans (challan_no, challan_date, source_depot, vehicle_no, total_cases, total_bottles, total_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'VERIFIED')
    `);
    const challanResult = challanStmt.run(
      'WBSBCL/KOL/2026/CH-91402',
      today,
      'WBSBCL Central Depot - Cossipore, Kolkata',
      'WB-02-AK-4491',
      24,
      384,
      186400.0
    );

    console.log('✓ Seeded sample WBSBCL Inward Challan.');
  }

  console.log('[Seed] Database initialization complete.');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
