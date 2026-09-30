const mongoose = require("mongoose");
require("../config/db");
const Product = require("../models/Product");
const Category = require("../models/Category");

(async () => {
    try {
        const categories = await Category.find();
        const validNames = categories.map(c => c.name.trim());
        
        console.log("📁 Valid categories:\n");
        validNames.forEach(n => console.log(`   "${n}"`));
        console.log("");

        const products = await Product.find();
        console.log(`📦 Total products: ${products.length}`);
        console.log("");

        // Group products by their category value
        const productsByCategory = {};
        products.forEach(p => {
            const cat = (p.category || '').trim();
            if (!productsByCategory[cat]) productsByCategory[cat] = [];
            productsByCategory[cat].push(p);
        });

        console.log("🔍 Product categories in DB:\n");
        Object.keys(productsByCategory).sort().forEach(cat => {
            const exact = validNames.includes(cat);
            console.log(`   ${exact ? '✅' : '❌'} "${cat}" (${productsByCategory[cat].length} products)`);
        });
        console.log("");
        console.log("=".repeat(60));
        console.log("\n🔧 AUTO-FIXING MISMATCHES:\n");

        let fixed = 0;

        for (const [prodCat, prods] of Object.entries(productsByCategory)) {
            if (validNames.includes(prodCat)) continue; // exact match — good

            // Try case-insensitive match
            let match = categories.find(c => 
                c.name.trim().toLowerCase() === prodCat.toLowerCase()
            );

            // If no case-insensitive match, try ignoring trailing 's'
            if (!match) {
                match = categories.find(c => 
                    c.name.trim().toLowerCase().replace(/s$/, '') === 
                    prodCat.toLowerCase().replace(/s$/, '')
                );
            }

            if (match) {
                console.log(`🔧 "${prodCat}" → "${match.name}" (${prods.length} products)`);
                for (const p of prods) {
                    p.category = match.name;
                    await p.save();
                    fixed++;
                }
            } else {
                console.log(`⚠️  NO MATCH: "${prodCat}" (${prods.length} products) — you must add this category`);
            }
        }

        console.log("");
        console.log(`✅ Done! Fixed ${fixed} product(s).`);
        console.log("");
        console.log("⚠️  Categories that need to be added manually:");
        for (const [prodCat] of Object.entries(productsByCategory)) {
            if (validNames.includes(prodCat)) continue;
            const match = categories.find(c => 
                c.name.trim().toLowerCase() === prodCat.toLowerCase() ||
                c.name.trim().toLowerCase().replace(/s$/, '') === prodCat.toLowerCase().replace(/s$/, '')
            );
            if (!match) console.log(`   → "${prodCat}"`);
        }

        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
})();