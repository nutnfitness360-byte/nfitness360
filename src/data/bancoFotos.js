// Banco de fotos de platillos (572). Índice MEJORADO + 11 platillos nuevos
// (chilaquiles, sopes, tlacoyos, crepa, pasta boloñesa, pizza, hamburguesa, plato mediterráneo,
// frijoles, cereal, bisquet) tomados del recetario. Cada entrada: { file, label, keys }.
// Las imágenes viven en public/menu-images/.
const BANCO_FOTOS = [
 {
  "file": "avena-con-fresa-y-nuez-04721cae.jpg",
  "label": "Avena con fresa y nuez",
  "keys": [
   "avena",
   "fresa",
   "nuez"
  ]
 },
 {
  "file": "bowl-de-yogurt-con-platano-y-chia-05f2e290.jpg",
  "label": "Bowl de yogurt con plátano y chía",
  "keys": [
   "yogurt",
   "platano",
   "chia",
   "banana"
  ]
 },
 {
  "file": "huevo-con-nopales-084395fa.jpg",
  "label": "Huevo con nopales",
  "keys": [
   "huevo",
   "huevos",
   "nopal",
   "nopales",
   "clara",
   "claras"
  ]
 },
 {
  "file": "huevos-revueltos-con-espinaca-y-jitomate-08b71ffb.jpg",
  "label": "Huevos revueltos con espinaca y jitomate",
  "keys": [
   "huevo",
   "huevos",
   "espinaca",
   "espinacas",
   "jitomate",
   "tomate",
   "clara",
   "claras"
  ]
 },
 {
  "file": "avo-toast-de-salmon-ahumado-0db82c23.jpg",
  "label": "Avo toast de salmón ahumado",
  "keys": [
   "salmon",
   "aguacate",
   "avo",
   "pepino",
   "toast"
  ]
 },
 {
  "file": "pan-toast-con-mantequilla-1595f995.jpg",
  "label": "Pan / toast con mantequilla",
  "keys": [
   "pan",
   "toast",
   "mantequilla",
   "frances"
  ]
 },
 {
  "file": "bowl-completo-pollo-arroz-garbanzo-1603ac7a.jpg",
  "label": "Bowl completo (pollo, arroz, garbanzo)",
  "keys": [
   "bowl",
   "pollo",
   "arroz",
   "garbanzo",
   "garbanzos"
  ]
 },
 {
  "file": "overnight-oats-con-kiwi-173a9a48.jpg",
  "label": "Overnight oats con kiwi",
  "keys": [
   "overnight",
   "avena",
   "yogurt",
   "kiwi"
  ]
 },
 {
  "file": "bowl-de-fruta-frutos-rojos-17a41bbe.jpg",
  "label": "Bowl de fruta (frutos rojos)",
  "keys": [
   "fruta",
   "fresa",
   "arandano",
   "arandanos",
   "frambuesa",
   "blueberries",
   "berries",
   "frutos"
  ]
 },
 {
  "file": "avo-toast-de-salmon-y-arugula-1a117728.jpg",
  "label": "Avo toast de salmón y arúgula",
  "keys": [
   "salmon",
   "aguacate",
   "avo",
   "arugula",
   "toast"
  ]
 },
 {
  "file": "molletes-1b9f70aa.jpg",
  "label": "Molletes",
  "keys": [
   "molletes",
   "mollete"
  ]
 },
 {
  "file": "pepino-y-zanahoria-con-tajin-1ff9385c.jpg",
  "label": "Pepino y zanahoria con Tajín",
  "keys": [
   "pepino",
   "zanahoria",
   "tajin",
   "verdura",
   "verduras"
  ]
 },
 {
  "file": "salmon-con-ensalada-207c54a6.jpg",
  "label": "Salmón con ensalada",
  "keys": [
   "salmon",
   "ensalada",
   "aguacate"
  ]
 },
 {
  "file": "filete-de-pescado-con-papas-y-ensalada-22078269.jpg",
  "label": "Filete de pescado con papas y ensalada",
  "keys": [
   "pescado",
   "filete",
   "papa",
   "papas",
   "ensalada"
  ]
 },
 {
  "file": "huevo-al-gusto-con-fruta-23ff0e72.jpg",
  "label": "Huevo al gusto con fruta",
  "keys": [
   "huevo",
   "huevos",
   "fresa",
   "aguacate",
   "cafe",
   "clara",
   "claras"
  ]
 },
 {
  "file": "manzana-con-crema-de-cacahuate-24c21928.jpg",
  "label": "Manzana con crema de cacahuate",
  "keys": [
   "manzana",
   "cacahuate",
   "crema"
  ]
 },
 {
  "file": "palomitas-27d117e6.jpg",
  "label": "Palomitas",
  "keys": [
   "palomitas",
   "palomita"
  ]
 },
 {
  "file": "proteina-suplemento-batido-2bdff8b5.jpg",
  "label": "Proteína / suplemento (batido)",
  "keys": [
   "proteina",
   "suplemento",
   "whey",
   "batido"
  ]
 },
 {
  "file": "toast-caprese-2d793ff2.jpg",
  "label": "Toast caprese",
  "keys": [
   "caprese",
   "pan",
   "toast",
   "jitomate",
   "queso",
   "albahaca"
  ]
 },
 {
  "file": "avo-toast-de-salmon-con-huevo-2e12f3d8.jpg",
  "label": "Avo toast de salmón con huevo",
  "keys": [
   "salmon",
   "aguacate",
   "avo",
   "toast",
   "huevo",
   "clara",
   "claras"
  ]
 },
 {
  "file": "ensalada-de-nopales-301b4a1f.jpg",
  "label": "Ensalada de nopales",
  "keys": [
   "nopales",
   "nopal",
   "ensalada"
  ]
 },
 {
  "file": "bowl-de-yogurt-con-mango-3055a6be.jpg",
  "label": "Bowl de yogurt con mango",
  "keys": [
   "yogurt",
   "mango",
   "granola"
  ]
 },
 {
  "file": "bowl-de-acai-smoothie-bowl-3497145d.jpg",
  "label": "Bowl de açaí / smoothie bowl",
  "keys": [
   "acai",
   "bowl",
   "smoothie",
   "berries",
   "granola",
   "fresa"
  ]
 },
 {
  "file": "omelette-360a45c9.jpg",
  "label": "Omelette",
  "keys": [
   "omelette",
   "omelet",
   "huevo",
   "ensalada",
   "omellete",
   "omele",
   "omelett",
   "clara",
   "claras"
  ]
 },
 {
  "file": "uvas-37624af9.jpg",
  "label": "Uvas",
  "keys": [
   "uva",
   "uvas",
   "fruta"
  ]
 },
 {
  "file": "filete-de-pescado-con-papas-y-ensalada-3806b409.jpg",
  "label": "Filete de pescado con papas y ensalada",
  "keys": [
   "pescado",
   "filete",
   "papa",
   "papas",
   "ensalada"
  ]
 },
 {
  "file": "tacos-de-pescado-3a5e4f2f.jpg",
  "label": "Tacos de pescado",
  "keys": [
   "tacos",
   "taco",
   "pescado"
  ]
 },
 {
  "file": "tostadas-de-tinga-de-pollo-3c40f42a.jpg",
  "label": "Tostadas de tinga de pollo",
  "keys": [
   "tostadas",
   "tostada",
   "tinga",
   "pollo"
  ]
 },
 {
  "file": "yogurt-griego-con-granola-y-arandano-3e1d3bbc.jpg",
  "label": "Yogurt griego con granola y arándano",
  "keys": [
   "yogurt",
   "griego",
   "granola",
   "arandano",
   "blueberry"
  ]
 },
 {
  "file": "waffle-con-platano-huevo-y-fresa-41819aee.jpg",
  "label": "Waffle con plátano, huevo y fresa",
  "keys": [
   "waffle",
   "waffles",
   "platano",
   "huevo",
   "fresa",
   "banana",
   "clara",
   "claras"
  ]
 },
 {
  "file": "kiwi-con-chocolate-43c1b6a2.jpg",
  "label": "Kiwi con chocolate",
  "keys": [
   "kiwi",
   "chocolate",
   "fruta"
  ]
 },
 {
  "file": "ensalada-de-garbanzo-4c2c258c.jpg",
  "label": "Ensalada de garbanzo",
  "keys": [
   "ensalada",
   "garbanzo",
   "garbanzos",
   "pepino",
   "jitomate"
  ]
 },
 {
  "file": "omelette-520b8dfa.jpg",
  "label": "Omelette",
  "keys": [
   "omelette",
   "omelet",
   "huevo",
   "ensalada",
   "omellete",
   "omele",
   "omelett",
   "clara",
   "claras"
  ]
 },
 {
  "file": "omelette-de-champinones-y-espinaca-544342b6.jpg",
  "label": "Omelette de champiñones y espinaca",
  "keys": [
   "omelette",
   "omelet",
   "champinones",
   "espinaca",
   "huevo",
   "omellete",
   "omele",
   "omelett",
   "clara",
   "claras"
  ]
 },
 {
  "file": "filete-de-pescado-con-arroz-y-ejotes-5b4c9841.jpg",
  "label": "Filete de pescado con arroz y ejotes",
  "keys": [
   "pescado",
   "filete",
   "arroz",
   "ejotes"
  ]
 },
 {
  "file": "bowl-de-pollo-con-quinoa-6156acab.jpg",
  "label": "Bowl de pollo con quinoa",
  "keys": [
   "bowl",
   "pollo",
   "quinoa",
   "aguacate",
   "ensalada"
  ]
 },
 {
  "file": "jicama-y-pepino-con-chile-61f0506e.jpg",
  "label": "Jícama y pepino con chile",
  "keys": [
   "jicama",
   "pepino",
   "chile",
   "tajin"
  ]
 },
 {
  "file": "avo-toast-con-cottage-y-salmon-656ee1b2.jpg",
  "label": "Avo toast con cottage y salmón",
  "keys": [
   "salmon",
   "aguacate",
   "avo",
   "toast",
   "cottage",
   "requeson"
  ]
 },
 {
  "file": "rice-cake-con-crema-de-cacahuate-664ee46f.jpg",
  "label": "Rice cake con crema de cacahuate",
  "keys": [
   "rice",
   "cake",
   "cacahuate",
   "crema",
   "tostada",
   "tostadas",
   "arroz",
   "tortita",
   "tortitas"
  ]
 },
 {
  "file": "kiwi-674284fc.jpg",
  "label": "Kiwi",
  "keys": [
   "kiwi",
   "fruta"
  ]
 },
 {
  "file": "bowl-de-camaron-con-quinoa-6986415c.jpg",
  "label": "Bowl de camarón con quinoa",
  "keys": [
   "camaron",
   "camarones",
   "quinoa",
   "ensalada",
   "bowl"
  ]
 },
 {
  "file": "yogurt-con-manzana-y-nuez-6a9f95f8.jpg",
  "label": "Yogurt con manzana y nuez",
  "keys": [
   "yogurt",
   "manzana",
   "nuez",
   "canela"
  ]
 },
 {
  "file": "ensalada-de-pollo-6aa80631.jpg",
  "label": "Ensalada de pollo",
  "keys": [
   "ensalada",
   "pollo",
   "aguacate"
  ]
 },
 {
  "file": "toast-con-crema-de-cacahuate-y-manzana-6ed2628b.jpg",
  "label": "Toast con crema de cacahuate y manzana",
  "keys": [
   "toast",
   "pan",
   "cacahuate",
   "manzana",
   "crema"
  ]
 },
 {
  "file": "mango-con-pepino-y-limon-6f49693e.jpg",
  "label": "Mango con pepino y limón",
  "keys": [
   "mango",
   "pepino",
   "limon",
   "fruta"
  ]
 },
 {
  "file": "mango-7013ca6b.jpg",
  "label": "Mango",
  "keys": [
   "mango",
   "fruta"
  ]
 },
 {
  "file": "pan-frances-con-fresa-7244512c.jpg",
  "label": "Pan francés con fresa",
  "keys": [
   "pan",
   "frances",
   "fresa",
   "toast"
  ]
 },
 {
  "file": "yogurt-con-fresa-y-nuez-7390a2cd.jpg",
  "label": "Yogurt con fresa y nuez",
  "keys": [
   "yogurt",
   "fresa",
   "nuez"
  ]
 },
 {
  "file": "hot-cakes-con-fresa-7668a681.jpg",
  "label": "Hot cakes con fresa",
  "keys": [
   "hotcakes",
   "hot",
   "cakes",
   "pancakes",
   "fresa",
   "hotcake",
   "panqueque",
   "panqueques"
  ]
 },
 {
  "file": "bowl-de-yogurt-con-granola-y-frutos-rojos-7779682d.jpg",
  "label": "Bowl de yogurt con granola y frutos rojos",
  "keys": [
   "yogurt",
   "granola",
   "fresa",
   "arandano",
   "blueberry",
   "berries"
  ]
 },
 {
  "file": "huevo-a-la-mexicana-con-rajas-77c81707.jpg",
  "label": "Huevo a la mexicana / con rajas",
  "keys": [
   "huevo",
   "huevos",
   "rajas",
   "mexicana",
   "poblano",
   "clara",
   "claras"
  ]
 },
 {
  "file": "kiwi-con-chocolate-797d0b5c.jpg",
  "label": "Kiwi con chocolate",
  "keys": [
   "kiwi",
   "chocolate",
   "fruta"
  ]
 },
 {
  "file": "ensalada-de-atun-7a05a06b.jpg",
  "label": "Ensalada de atún",
  "keys": [
   "ensalada",
   "atun",
   "pepino",
   "jitomate"
  ]
 },
 {
  "file": "hot-cakes-con-fresa-7b7feeca.jpg",
  "label": "Hot cakes con fresa",
  "keys": [
   "hotcakes",
   "hot",
   "cakes",
   "pancakes",
   "fresa",
   "yogurt",
   "hotcake",
   "panqueque",
   "panqueques"
  ]
 },
 {
  "file": "toast-de-pavo-con-aguacate-7cea73fc.jpg",
  "label": "Toast de pavo con aguacate",
  "keys": [
   "toast",
   "pan",
   "pavo",
   "aguacate"
  ]
 },
 {
  "file": "smoothie-de-fresa-8101a29a.jpg",
  "label": "Smoothie de fresa",
  "keys": [
   "smoothie",
   "fresa",
   "batido"
  ]
 },
 {
  "file": "ensalada-de-atun-sellado-81a825c1.jpg",
  "label": "Ensalada de atún sellado",
  "keys": [
   "ensalada",
   "atun",
   "sellado",
   "aguacate"
  ]
 },
 {
  "file": "filete-de-pescado-con-papas-y-ensalada-81b9422d.jpg",
  "label": "Filete de pescado con papas y ensalada",
  "keys": [
   "pescado",
   "filete",
   "papa",
   "papas",
   "ensalada"
  ]
 },
 {
  "file": "cottage-con-fresa-y-pistache-81d2d87b.jpg",
  "label": "Cottage con fresa y pistache",
  "keys": [
   "cottage",
   "fresa",
   "pistache",
   "yogurt",
   "requeson"
  ]
 },
 {
  "file": "sandwich-de-aguacate-8514af82.jpg",
  "label": "Sándwich de aguacate",
  "keys": [
   "sandwich",
   "aguacate",
   "ensalada"
  ]
 },
 {
  "file": "bowl-de-yogurt-con-kiwi-y-chia-8aac4dfa.jpg",
  "label": "Bowl de yogurt con kiwi y chía",
  "keys": [
   "yogurt",
   "kiwi",
   "chia"
  ]
 },
 {
  "file": "gorditas-de-huevo-8d613926.jpg",
  "label": "Gorditas de huevo",
  "keys": [
   "gorditas",
   "gordita",
   "huevo",
   "arepa",
   "clara",
   "claras"
  ]
 },
 {
  "file": "toast-de-crema-de-cacahuate-con-mermelada-y-platano-8ec685ac.jpg",
  "label": "Toast de crema de cacahuate con mermelada y plátano",
  "keys": [
   "toast",
   "pan",
   "cacahuate",
   "mermelada",
   "platano",
   "banana"
  ]
 },
 {
  "file": "green-smoothie-jugo-verde-92408e20.jpg",
  "label": "Green smoothie / jugo verde",
  "keys": [
   "green",
   "smoothie",
   "jugo",
   "verde"
  ]
 },
 {
  "file": "avo-toast-de-salmon-con-queso-crema-93df3bba.jpg",
  "label": "Avo toast de salmón con queso crema",
  "keys": [
   "salmon",
   "aguacate",
   "avo",
   "toast",
   "queso"
  ]
 },
 {
  "file": "enfrijoladas-93ed7b15.jpg",
  "label": "Enfrijoladas",
  "keys": [
   "enfrijoladas",
   "enchiladas",
   "frijol",
   "entomatadas",
   "entomatada"
  ]
 },
 {
  "file": "tostadas-de-verduras-con-panela-99f874c1.jpg",
  "label": "Tostadas de verduras con panela",
  "keys": [
   "tostadas",
   "tostada",
   "panela",
   "verduras",
   "ensalada"
  ]
 },
 {
  "file": "overnight-oats-con-fresa-9a603d06.jpg",
  "label": "Overnight oats con fresa",
  "keys": [
   "overnight",
   "avena",
   "fresa",
   "granola"
  ]
 },
 {
  "file": "omelette-de-espinaca-9ac57f00.jpg",
  "label": "Omelette de espinaca",
  "keys": [
   "omelette",
   "omelet",
   "espinaca",
   "huevo",
   "jitomate",
   "omellete",
   "omele",
   "omelett",
   "clara",
   "claras"
  ]
 },
 {
  "file": "chia-pudding-con-platano-9b9d28a0.jpg",
  "label": "Chía pudding con plátano",
  "keys": [
   "chia",
   "pudding",
   "platano",
   "granola",
   "banana"
  ]
 },
 {
  "file": "quesadillas-de-pollo-9bd87548.jpg",
  "label": "Quesadillas de pollo",
  "keys": [
   "quesadillas",
   "quesadilla",
   "pollo",
   "sincronizada",
   "sincronizadas"
  ]
 },
 {
  "file": "huevos-a-la-mexicana-9c1677c4.jpg",
  "label": "Huevos a la mexicana",
  "keys": [
   "huevo",
   "huevos",
   "mexicana",
   "clara",
   "claras"
  ]
 },
 {
  "file": "avena-con-manzana-y-canela-9c9fa35a.jpg",
  "label": "Avena con manzana y canela",
  "keys": [
   "avena",
   "manzana",
   "canela"
  ]
 },
 {
  "file": "huevo-con-nopales-y-frijoles-9ef72a40.jpg",
  "label": "Huevo con nopales y frijoles",
  "keys": [
   "huevo",
   "huevos",
   "nopal",
   "nopales",
   "frijol",
   "clara",
   "claras"
  ]
 },
 {
  "file": "sandwich-de-pavo-con-aguacate-a4a21b69.jpg",
  "label": "Sándwich de pavo con aguacate",
  "keys": [
   "sandwich",
   "pavo",
   "aguacate"
  ]
 },
 {
  "file": "tostadas-de-bistec-con-nopales-a79eebc5.jpg",
  "label": "Tostadas de bistec con nopales",
  "keys": [
   "tostadas",
   "tostada",
   "bistec",
   "nopales",
   "carne"
  ]
 },
 {
  "file": "pollo-con-verduras-y-arroz-a906bffe.jpg",
  "label": "Pollo con verduras y arroz",
  "keys": [
   "pollo",
   "verduras",
   "arroz",
   "salteado"
  ]
 },
 {
  "file": "huevos-rancheros-a9667de8.jpg",
  "label": "Huevos rancheros",
  "keys": [
   "huevos",
   "huevo",
   "rancheros",
   "clara",
   "claras"
  ]
 },
 {
  "file": "cottage-con-durazno-y-granola-abf997b1.jpg",
  "label": "Cottage con durazno y granola",
  "keys": [
   "cottage",
   "durazno",
   "granola",
   "requeson"
  ]
 },
 {
  "file": "smoothie-de-platano-ad24e82c.jpg",
  "label": "Smoothie de plátano",
  "keys": [
   "smoothie",
   "platano",
   "batido",
   "banana"
  ]
 },
 {
  "file": "smoothie-de-papaya-af52a9aa.jpg",
  "label": "Smoothie de papaya",
  "keys": [
   "smoothie",
   "papaya",
   "batido"
  ]
 },
 {
  "file": "pera-af849f1b.jpg",
  "label": "Pera",
  "keys": [
   "pera",
   "fruta"
  ]
 },
 {
  "file": "wrap-de-pavo-b0a9a5c7.jpg",
  "label": "Wrap de pavo",
  "keys": [
   "wrap",
   "pavo",
   "aguacate"
  ]
 },
 {
  "file": "omelette-de-atun-b11429d5.jpg",
  "label": "Omelette de atún",
  "keys": [
   "omelette",
   "omelet",
   "atun",
   "huevo",
   "omellete",
   "omele",
   "omelett",
   "clara",
   "claras"
  ]
 },
 {
  "file": "mango-b118acad.jpg",
  "label": "Mango",
  "keys": [
   "mango",
   "fruta"
  ]
 },
 {
  "file": "tostadas-de-atun-con-guacamole-b397194d.jpg",
  "label": "Tostadas de atún con guacamole",
  "keys": [
   "tostadas",
   "tostada",
   "atun",
   "guacamole"
  ]
 },
 {
  "file": "rice-cake-con-crema-de-cacahuate-b5070045.jpg",
  "label": "Rice cake con crema de cacahuate",
  "keys": [
   "rice",
   "cake",
   "cacahuate",
   "crema",
   "tostada",
   "tostadas",
   "arroz",
   "tortita",
   "tortitas"
  ]
 },
 {
  "file": "omelette-de-espinaca-y-jitomate-b715de38.jpg",
  "label": "Omelette de espinaca y jitomate",
  "keys": [
   "omelette",
   "omelet",
   "espinaca",
   "huevo",
   "jitomate",
   "frittata",
   "omellete",
   "omele",
   "omelett",
   "clara",
   "claras"
  ]
 },
 {
  "file": "hot-cakes-con-arandano-b80ca901.jpg",
  "label": "Hot cakes con arándano",
  "keys": [
   "hotcakes",
   "hot",
   "cakes",
   "pancakes",
   "arandano",
   "blueberry",
   "hotcake",
   "panqueque",
   "panqueques"
  ]
 },
 {
  "file": "huevo-con-jamon-y-avo-toast-b9a88647.jpg",
  "label": "Huevo con jamón y avo toast",
  "keys": [
   "huevo",
   "huevos",
   "jamon",
   "avo",
   "toast",
   "aguacate",
   "clara",
   "claras"
  ]
 },
 {
  "file": "toast-de-atun-b9a91a9b.jpg",
  "label": "Toast de atún",
  "keys": [
   "toast",
   "atun",
   "ceviche",
   "tostada"
  ]
 },
 {
  "file": "sandwich-de-crema-de-cacahuate-y-platano-bd60cddf.jpg",
  "label": "Sándwich de crema de cacahuate y plátano",
  "keys": [
   "sandwich",
   "cacahuate",
   "platano",
   "crema",
   "banana"
  ]
 },
 {
  "file": "hot-cakes-bf854f36.jpg",
  "label": "Hot cakes",
  "keys": [
   "hotcakes",
   "hot",
   "cakes",
   "pancakes",
   "hotcake",
   "panqueque",
   "panqueques"
  ]
 },
 {
  "file": "smoothie-de-pina-c1a08c97.jpg",
  "label": "Smoothie de piña",
  "keys": [
   "smoothie",
   "pina",
   "coco",
   "batido"
  ]
 },
 {
  "file": "proteina-suplemento-batido-c266d718.jpg",
  "label": "Proteína / suplemento (batido)",
  "keys": [
   "proteina",
   "suplemento",
   "whey",
   "batido"
  ]
 },
 {
  "file": "avena-con-platano-y-canela-c3abdd78.jpg",
  "label": "Avena con plátano y canela",
  "keys": [
   "avena",
   "platano",
   "canela",
   "banana"
  ]
 },
 {
  "file": "yogurt-con-mango-y-nuez-c4f24fb1.jpg",
  "label": "Yogurt con mango y nuez",
  "keys": [
   "yogurt",
   "mango",
   "nuez",
   "cashew"
  ]
 },
 {
  "file": "sandwich-de-pavo-con-aguacate-c661b447.jpg",
  "label": "Sándwich de pavo con aguacate",
  "keys": [
   "sandwich",
   "pavo",
   "aguacate"
  ]
 },
 {
  "file": "batido-de-proteina-chocolate-c81d2be4.jpg",
  "label": "Batido de proteína (chocolate)",
  "keys": [
   "proteina",
   "batido",
   "chocolate",
   "smoothie"
  ]
 },
 {
  "file": "bowl-de-yogurt-con-granola-y-frutos-rojos-cd77f20f.jpg",
  "label": "Bowl de yogurt con granola y frutos rojos",
  "keys": [
   "yogurt",
   "granola",
   "fresa",
   "arandano",
   "berries"
  ]
 },
 {
  "file": "wrap-de-verduras-con-hummus-cfe76798.jpg",
  "label": "Wrap de verduras con hummus",
  "keys": [
   "wrap",
   "verduras",
   "hummus",
   "aguacate"
  ]
 },
 {
  "file": "bowl-de-quinoa-con-garbanzo-d09489a5.jpg",
  "label": "Bowl de quinoa con garbanzo",
  "keys": [
   "bowl",
   "quinoa",
   "garbanzo",
   "aguacate",
   "verduras"
  ]
 },
 {
  "file": "avo-toast-d15de246.jpg",
  "label": "Avo toast",
  "keys": [
   "avo",
   "toast",
   "aguacate",
   "pan"
  ]
 },
 {
  "file": "arroz-blanco-d1ad870e.jpg",
  "label": "Arroz blanco",
  "keys": [
   "arroz",
   "blanco"
  ]
 },
 {
  "file": "hot-cakes-de-espinaca-verdes-d2e17161.jpg",
  "label": "Hot cakes de espinaca (verdes)",
  "keys": [
   "hotcakes",
   "hot",
   "cakes",
   "pancakes",
   "espinaca",
   "verde",
   "hotcake",
   "panqueque",
   "panqueques"
  ]
 },
 {
  "file": "papas-cambray-d35ee765.jpg",
  "label": "Papas cambray",
  "keys": [
   "papa",
   "papas",
   "cambray"
  ]
 },
 {
  "file": "manzana-verde-d48e8015.jpg",
  "label": "Manzana verde",
  "keys": [
   "manzana",
   "verde",
   "fruta"
  ]
 },
 {
  "file": "yogurt-con-fresa-y-nuez-d494b64f.jpg",
  "label": "Yogurt con fresa y nuez",
  "keys": [
   "yogurt",
   "fresa",
   "nuez"
  ]
 },
 {
  "file": "hot-cakes-de-avena-con-platano-d58f23e3.jpg",
  "label": "Hot cakes de avena con plátano",
  "keys": [
   "hotcakes",
   "hot",
   "cakes",
   "pancakes",
   "avena",
   "platano",
   "hotcake",
   "panqueque",
   "panqueques",
   "banana"
  ]
 },
 {
  "file": "palomitas-d80d5a96.jpg",
  "label": "Palomitas",
  "keys": [
   "palomitas",
   "palomita"
  ]
 },
 {
  "file": "rollitos-de-jamon-dbbc05e9.jpg",
  "label": "Rollitos de jamón",
  "keys": [
   "rollitos",
   "jamon",
   "rollo",
   "pavo"
  ]
 },
 {
  "file": "manzana-con-crema-de-cacahuate-e4a7a0ff.jpg",
  "label": "Manzana con crema de cacahuate",
  "keys": [
   "manzana",
   "cacahuate",
   "crema"
  ]
 },
 {
  "file": "rice-cake-con-cottage-e6671aec.jpg",
  "label": "Rice cake con cottage",
  "keys": [
   "rice",
   "cake",
   "cottage",
   "requeson",
   "tostada",
   "tostadas",
   "arroz",
   "tortita",
   "tortitas"
  ]
 },
 {
  "file": "bowl-de-pollo-con-arroz-y-brocoli-e898f45e.jpg",
  "label": "Bowl de pollo con arroz y brócoli",
  "keys": [
   "bowl",
   "pollo",
   "arroz",
   "brocoli"
  ]
 },
 {
  "file": "toast-con-crema-de-cacahuate-ec6eb1e1.jpg",
  "label": "Toast con crema de cacahuate",
  "keys": [
   "toast",
   "pan",
   "cacahuate",
   "crema"
  ]
 },
 {
  "file": "toast-con-mermelada-f027ec04.jpg",
  "label": "Toast con mermelada",
  "keys": [
   "toast",
   "pan",
   "mermelada"
  ]
 },
 {
  "file": "hot-cakes-de-platano-f37ede98.jpg",
  "label": "Hot cakes de plátano",
  "keys": [
   "hotcakes",
   "hot",
   "cakes",
   "pancakes",
   "platano",
   "hotcake",
   "panqueque",
   "panqueques",
   "banana"
  ]
 },
 {
  "file": "hot-cakes-con-huevo-y-fresa-f637f683.jpg",
  "label": "Hot cakes con huevo y fresa",
  "keys": [
   "hotcakes",
   "hot",
   "cakes",
   "pancakes",
   "huevo",
   "fresa",
   "hotcake",
   "panqueque",
   "panqueques",
   "clara",
   "claras"
  ]
 },
 {
  "file": "sandwich-de-crema-de-cacahuate-f699f1b0.jpg",
  "label": "Sándwich de crema de cacahuate",
  "keys": [
   "sandwich",
   "cacahuate",
   "crema"
  ]
 },
 {
  "file": "toast-de-huevo-con-pico-de-gallo-f69ef2e4.jpg",
  "label": "Toast de huevo con pico de gallo",
  "keys": [
   "toast",
   "pan",
   "huevo",
   "aguacate",
   "pico",
   "clara",
   "claras"
  ]
 },
 {
  "file": "panela-asada-con-nopales-f8411658.jpg",
  "label": "Panela asada con nopales",
  "keys": [
   "panela",
   "nopales",
   "queso",
   "aguacate",
   "asada"
  ]
 },
 {
  "file": "tostadas-de-panela-con-frijol-f8c9d66e.jpg",
  "label": "Tostadas de panela con frijol",
  "keys": [
   "tostadas",
   "tostada",
   "panela",
   "frijol",
   "queso"
  ]
 },
 {
  "file": "sandwich-de-crema-de-cacahuate-f9f4eadc.jpg",
  "label": "Sándwich de crema de cacahuate",
  "keys": [
   "sandwich",
   "cacahuate",
   "crema"
  ]
 },
 {
  "file": "avena-con-fresa-faa6ce8b.jpg",
  "label": "Avena con fresa",
  "keys": [
   "avena",
   "fresa"
  ]
 },
 {
  "file": "tostadas-de-atun-con-aguacate-fb0698d4.jpg",
  "label": "Tostadas de atún con aguacate",
  "keys": [
   "tostadas",
   "tostada",
   "atun",
   "aguacate"
  ]
 },
 {
  "file": "smoothie-de-frutos-rojos-fd5b3a26.jpg",
  "label": "Smoothie de frutos rojos",
  "keys": [
   "smoothie",
   "frutos",
   "berries",
   "arandano",
   "fresa",
   "batido"
  ]
 },
 {
  "file": "toast-de-hummus-y-aguacate-fe83fefb.jpg",
  "label": "Toast de hummus y aguacate",
  "keys": [
   "toast",
   "pan",
   "hummus",
   "aguacate",
   "jitomate"
  ]
 },
 {
  "file": "smoothie-de-pina-ff859ae5.jpg",
  "label": "Smoothie de piña",
  "keys": [
   "smoothie",
   "pina",
   "coco",
   "batido"
  ]
 },
 {
  "file": "chilaquiles-verdes-457f20d6.jpg",
  "label": "Chilaquiles verdes",
  "keys": [
   "chilaquiles",
   "chilquiles",
   "totopos",
   "verdes"
  ]
 },
 {
  "file": "sopes-7615428c.jpg",
  "label": "Sopes",
  "keys": [
   "sopes",
   "sope"
  ]
 },
 {
  "file": "tlacoyos-a1a334ff.jpg",
  "label": "Tlacoyos",
  "keys": [
   "tlacoyos",
   "tlacoyo"
  ]
 },
 {
  "file": "crepa-salada-de-huevo-57d0d5c9.jpg",
  "label": "Crepa salada de huevo",
  "keys": [
   "crepa",
   "crepas",
   "crepe",
   "huevo",
   "espinaca"
  ]
 },
 {
  "file": "pasta-a-la-bolonesa-6488fc84.jpg",
  "label": "Pasta a la boloñesa",
  "keys": [
   "pasta",
   "spaghetti",
   "espagueti",
   "bolonesa",
   "carne"
  ]
 },
 {
  "file": "pizza-casera-fit-2e5cc603.jpg",
  "label": "Pizza casera / fit",
  "keys": [
   "pizza",
   "pita"
  ]
 },
 {
  "file": "hamburguesa-a4f5f420.jpg",
  "label": "Hamburguesa",
  "keys": [
   "hamburguesa",
   "burger"
  ]
 },
 {
  "file": "plato-mediterraneo-b180f8b3.jpg",
  "label": "Plato mediterráneo",
  "keys": [
   "mediterraneo",
   "mediterranea"
  ]
 },
 {
  "file": "frijoles-refritos-7ba97a98.jpg",
  "label": "Frijoles refritos",
  "keys": [
   "frijoles",
   "frijol",
   "refritos"
  ]
 },
 {
  "file": "cereal-con-leche-556c4682.jpg",
  "label": "Cereal con leche",
  "keys": [
   "cereal",
   "hojuelas",
   "proteina"
  ]
 },
 {
  "file": "bisquet-con-huevo-20ea085e.jpg",
  "label": "Bisquet con huevo",
  "keys": [
   "bisquet",
   "bagel",
   "huevo"
  ]
 },
 {
  "file": "aguacate.jpg",
  "label": "Aguacate",
  "keys": [
   "aguacate"
  ]
 },
 {
  "file": "alambre-de-pollo-con-verduras.jpg",
  "label": "Alambre de pollo con verduras",
  "keys": [
   "alambre",
   "pollo",
   "verduras"
  ]
 },
 {
  "file": "alambre-de-pollo.jpg",
  "label": "Alambre de pollo",
  "keys": [
   "alambre",
   "pollo"
  ]
 },
 {
  "file": "albondigas-suecas-de-pavo.jpg",
  "label": "Albondigas suecas de pavo",
  "keys": [
   "albondigas",
   "suecas",
   "pavo"
  ]
 },
 {
  "file": "arroz-frito-con-camaron.jpg",
  "label": "Arroz frito con camaron",
  "keys": [
   "arroz",
   "frito",
   "camaron"
  ]
 },
 {
  "file": "atole-proteico-de-avena.jpg",
  "label": "Atole proteico de avena",
  "keys": [
   "atole",
   "avena"
  ]
 },
 {
  "file": "atun-a-la-mexicana-con-pure-de-papa.jpg",
  "label": "Atun a la mexicana con pure de papa",
  "keys": [
   "atun",
   "mexicana",
   "pure",
   "papa"
  ]
 },
 {
  "file": "atun-a-la-mexicana-con-quinoa-y-espinaca.jpg",
  "label": "Atun a la mexicana con quinoa y espinaca",
  "keys": [
   "atun",
   "mexicana",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "atun-a-la-mexicana-con-quinoa.jpg",
  "label": "Atun a la mexicana con quinoa",
  "keys": [
   "atun",
   "mexicana",
   "quinoa"
  ]
 },
 {
  "file": "atun-a-la-plancha-con-quinoa.jpg",
  "label": "Atun a la plancha con quinoa",
  "keys": [
   "atun",
   "plancha",
   "quinoa"
  ]
 },
 {
  "file": "atun-al-chipotle-con-calabacitas.jpg",
  "label": "Atun al chipotle con calabacitas",
  "keys": [
   "atun",
   "chipotle",
   "calabacitas"
  ]
 },
 {
  "file": "atun-al-chipotle-con-camote-al-horno.jpg",
  "label": "Atun al chipotle con camote al horno",
  "keys": [
   "atun",
   "chipotle",
   "camote",
   "horno"
  ]
 },
 {
  "file": "atun-al-chipotle-con-esparragos.jpg",
  "label": "Atun al chipotle con esparragos",
  "keys": [
   "atun",
   "chipotle",
   "esparragos"
  ]
 },
 {
  "file": "atun-al-chipotle-con-pure-de-papa.jpg",
  "label": "Atun al chipotle con pure de papa",
  "keys": [
   "atun",
   "chipotle",
   "pure",
   "papa"
  ]
 },
 {
  "file": "atun-al-chipotle-con-quinoa-y-espinaca.jpg",
  "label": "Atun al chipotle con quinoa y espinaca",
  "keys": [
   "atun",
   "chipotle",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "atun-con-mayonesa-y-chipotle.jpg",
  "label": "Atun con mayonesa y chipotle",
  "keys": [
   "atun",
   "mayonesa",
   "chipotle"
  ]
 },
 {
  "file": "atun-en-salsa-de-soya-con-arroz.jpg",
  "label": "Atun en salsa de soya con arroz",
  "keys": [
   "atun",
   "salsa",
   "soya",
   "arroz"
  ]
 },
 {
  "file": "atun-en-salsa-de-soya-con-calabacitas.jpg",
  "label": "Atun en salsa de soya con calabacitas",
  "keys": [
   "atun",
   "salsa",
   "soya",
   "calabacitas"
  ]
 },
 {
  "file": "atun-en-salsa-de-soya-con-elote-y-calabaza.jpg",
  "label": "Atun en salsa de soya con elote y calabaza",
  "keys": [
   "atun",
   "salsa",
   "soya",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "atun-en-salsa-de-soya-con-esparragos.jpg",
  "label": "Atun en salsa de soya con esparragos",
  "keys": [
   "atun",
   "salsa",
   "soya",
   "esparragos"
  ]
 },
 {
  "file": "atun-guisado-a-la-mexicana.jpg",
  "label": "Atun guisado a la mexicana",
  "keys": [
   "atun",
   "guisado",
   "mexicana"
  ]
 },
 {
  "file": "avena-caliente-con-durazno.jpg",
  "label": "Avena caliente con durazno",
  "keys": [
   "avena",
   "caliente",
   "durazno"
  ]
 },
 {
  "file": "avena-caliente-con-mango.jpg",
  "label": "Avena caliente con mango",
  "keys": [
   "avena",
   "caliente",
   "mango"
  ]
 },
 {
  "file": "avena-caliente-con-papaya.jpg",
  "label": "Avena caliente con papaya",
  "keys": [
   "avena",
   "caliente",
   "papaya"
  ]
 },
 {
  "file": "avena-caliente-con-pina.jpg",
  "label": "Avena caliente con pina",
  "keys": [
   "avena",
   "caliente",
   "pina"
  ]
 },
 {
  "file": "avena-con-fruta.jpg",
  "label": "Avena con fruta",
  "keys": [
   "avena",
   "fruta"
  ]
 },
 {
  "file": "avena-con-papaya-y-chia.jpg",
  "label": "Avena con papaya y chia",
  "keys": [
   "avena",
   "papaya",
   "chia"
  ]
 },
 {
  "file": "avo-toast-con-huevo.jpg",
  "label": "Avo toast con huevo",
  "keys": [
   "avo",
   "toast",
   "huevo"
  ]
 },
 {
  "file": "bagel-integral-con-salmon.jpg",
  "label": "Bagel integral con salmon",
  "keys": [
   "bagel",
   "integral",
   "salmon"
  ]
 },
 {
  "file": "barbacoa-de-res-en-consome.jpg",
  "label": "Barbacoa de res en consome",
  "keys": [
   "barbacoa",
   "res",
   "consome"
  ]
 },
 {
  "file": "bastones-de-apio-con-hummus.jpg",
  "label": "Bastones de apio con hummus",
  "keys": [
   "bastones",
   "apio",
   "hummus"
  ]
 },
 {
  "file": "bastones-de-brocoli-con-hummus.jpg",
  "label": "Bastones de brocoli con hummus",
  "keys": [
   "bastones",
   "brocoli",
   "hummus"
  ]
 },
 {
  "file": "bastones-de-coliflor-con-hummus.jpg",
  "label": "Bastones de coliflor con hummus",
  "keys": [
   "bastones",
   "coliflor",
   "hummus"
  ]
 },
 {
  "file": "bastones-de-jicama-con-hummus.jpg",
  "label": "Bastones de jicama con hummus",
  "keys": [
   "bastones",
   "jicama",
   "hummus"
  ]
 },
 {
  "file": "bastones-de-pepino-con-hummus.jpg",
  "label": "Bastones de pepino con hummus",
  "keys": [
   "bastones",
   "pepino",
   "hummus"
  ]
 },
 {
  "file": "bastones-de-verdura-con-guacamole.jpg",
  "label": "Bastones de verdura con guacamole",
  "keys": [
   "bastones",
   "verdura",
   "guacamole"
  ]
 },
 {
  "file": "bastones-de-zanahoria-con-hummus.jpg",
  "label": "Bastones de zanahoria con hummus",
  "keys": [
   "bastones",
   "zanahoria",
   "hummus"
  ]
 },
 {
  "file": "berenjena-rellena-de-res.jpg",
  "label": "Berenjena rellena de res",
  "keys": [
   "berenjena",
   "rellena",
   "res"
  ]
 },
 {
  "file": "bisquet-half-half.jpg",
  "label": "Bisquet half half",
  "keys": [
   "bisquet",
   "half"
  ]
 },
 {
  "file": "bolitas-de-avena.jpg",
  "label": "Bolitas de avena",
  "keys": [
   "bolitas",
   "avena"
  ]
 },
 {
  "file": "bowl-de-camaron.jpg",
  "label": "Bowl de camaron",
  "keys": [
   "bowl",
   "camaron"
  ]
 },
 {
  "file": "bowl-de-cottage.jpg",
  "label": "Bowl de cottage",
  "keys": [
   "bowl",
   "cottage"
  ]
 },
 {
  "file": "bowl-de-res-con-brocoli.jpg",
  "label": "Bowl de res con brocoli",
  "keys": [
   "bowl",
   "res",
   "brocoli"
  ]
 },
 {
  "file": "bowl-de-yogurt-con-fruta.jpg",
  "label": "Bowl de yogurt con fruta",
  "keys": [
   "bowl",
   "yogurt",
   "fruta"
  ]
 },
 {
  "file": "bowl-proteico-dulce.jpg",
  "label": "Bowl proteico dulce",
  "keys": [
   "bowl",
   "dulce"
  ]
 },
 {
  "file": "breakfast-bowl-de-huevo-y-pavo.jpg",
  "label": "Breakfast bowl de huevo y pavo",
  "keys": [
   "breakfast",
   "bowl",
   "huevo",
   "pavo"
  ]
 },
 {
  "file": "brochetas-de-panela.jpg",
  "label": "Brochetas de panela",
  "keys": [
   "brochetas",
   "panela"
  ]
 },
 {
  "file": "brochetas-de-pollo.jpg",
  "label": "Brochetas de pollo",
  "keys": [
   "brochetas",
   "pollo"
  ]
 },
 {
  "file": "buddha-bowl-de-pavo.jpg",
  "label": "Buddha bowl de pavo",
  "keys": [
   "buddha",
   "bowl",
   "pavo"
  ]
 },
 {
  "file": "burrito-de-huevo-con-machaca.jpg",
  "label": "Burrito de huevo con machaca",
  "keys": [
   "burrito",
   "huevo",
   "machaca"
  ]
 },
 {
  "file": "calabaza-rellena-de-pollo.jpg",
  "label": "Calabaza rellena de pollo",
  "keys": [
   "calabaza",
   "rellena",
   "pollo"
  ]
 },
 {
  "file": "carpaccio-de-calabaza-y-panela.jpg",
  "label": "Carpaccio de calabaza y panela",
  "keys": [
   "carpaccio",
   "calabaza",
   "panela"
  ]
 },
 {
  "file": "cecina-con-panela.jpg",
  "label": "Cecina con panela",
  "keys": [
   "cecina",
   "panela"
  ]
 },
 {
  "file": "ceviche-de-pescado.jpg",
  "label": "Ceviche de pescado",
  "keys": [
   "ceviche",
   "pescado"
  ]
 },
 {
  "file": "chalupitas-de-nopal-cambray-con-pavo-y-pollo.jpg",
  "label": "Chalupitas de nopal cambray con pavo y pollo",
  "keys": [
   "chalupitas",
   "nopal",
   "cambray",
   "pavo",
   "pollo"
  ]
 },
 {
  "file": "chalupitas-de-nopal-con-pollo-desmenuzado.jpg",
  "label": "Chalupitas de nopal con pollo desmenuzado",
  "keys": [
   "chalupitas",
   "nopal",
   "pollo",
   "desmenuzado"
  ]
 },
 {
  "file": "chalupitas-de-nopal-con-pollo.jpg",
  "label": "Chalupitas de nopal con pollo",
  "keys": [
   "chalupitas",
   "nopal",
   "pollo"
  ]
 },
 {
  "file": "chalupitas-de-nopal-con-requeson.jpg",
  "label": "Chalupitas de nopal con requeson",
  "keys": [
   "chalupitas",
   "nopal",
   "requeson"
  ]
 },
 {
  "file": "chalupitas-de-pollo.jpg",
  "label": "Chalupitas de pollo",
  "keys": [
   "chalupitas",
   "pollo"
  ]
 },
 {
  "file": "chia-con-leche-y-fresa.jpg",
  "label": "Chia con leche y fresa",
  "keys": [
   "chia",
   "leche",
   "fresa"
  ]
 },
 {
  "file": "chia-con-leche-y-mango.jpg",
  "label": "Chia con leche y mango",
  "keys": [
   "chia",
   "leche",
   "mango"
  ]
 },
 {
  "file": "chia-pudin-overnight.jpg",
  "label": "Chia pudin overnight",
  "keys": [
   "chia",
   "pudin",
   "overnight"
  ]
 },
 {
  "file": "chilaquiles-rojos-con-huevo.jpg",
  "label": "Chilaquiles rojos con huevo",
  "keys": [
   "chilaquiles",
   "rojos",
   "huevo"
  ]
 },
 {
  "file": "chilaquiles-rojos-con-panela.jpg",
  "label": "Chilaquiles rojos con panela",
  "keys": [
   "chilaquiles",
   "rojos",
   "panela"
  ]
 },
 {
  "file": "chilaquiles-rojos-con-pollo.jpg",
  "label": "Chilaquiles rojos con pollo",
  "keys": [
   "chilaquiles",
   "rojos",
   "pollo"
  ]
 },
 {
  "file": "chilaquiles-rojos-horneados-con-huevo.jpg",
  "label": "Chilaquiles rojos horneados con huevo",
  "keys": [
   "chilaquiles",
   "rojos",
   "horneados",
   "huevo"
  ]
 },
 {
  "file": "chile-poblano-relleno-de-panela.jpg",
  "label": "Chile poblano relleno de panela",
  "keys": [
   "chile",
   "poblano",
   "relleno",
   "panela"
  ]
 },
 {
  "file": "chile-relleno-de-atun.jpg",
  "label": "Chile relleno de atun",
  "keys": [
   "chile",
   "relleno",
   "atun"
  ]
 },
 {
  "file": "chiles-rellenos-de-panela-al-horno.jpg",
  "label": "Chiles rellenos de panela al horno",
  "keys": [
   "chiles",
   "rellenos",
   "panela",
   "horno"
  ]
 },
 {
  "file": "chuleta-a-la-parrilla.jpg",
  "label": "Chuleta a la parrilla",
  "keys": [
   "chuleta",
   "parrilla"
  ]
 },
 {
  "file": "ciruela-natural.jpg",
  "label": "Ciruela natural",
  "keys": [
   "ciruela",
   "natural"
  ]
 },
 {
  "file": "claras-con-verduras.jpg",
  "label": "Claras con verduras",
  "keys": [
   "claras",
   "verduras"
  ]
 },
 {
  "file": "cochinita-pibil-de-pavo.jpg",
  "label": "Cochinita pibil de pavo",
  "keys": [
   "cochinita",
   "pibil",
   "pavo"
  ]
 },
 {
  "file": "coctel-de-fruta-con-chia.jpg",
  "label": "Coctel de fruta con chia",
  "keys": [
   "coctel",
   "fruta",
   "chia"
  ]
 },
 {
  "file": "crema-de-betabel-con-panela.jpg",
  "label": "Crema de betabel con panela",
  "keys": [
   "crema",
   "betabel",
   "panela"
  ]
 },
 {
  "file": "crema-de-brocoli-con-panela.jpg",
  "label": "Crema de brocoli con panela",
  "keys": [
   "crema",
   "brocoli",
   "panela"
  ]
 },
 {
  "file": "crema-de-calabaza-con-panela.jpg",
  "label": "Crema de calabaza con panela",
  "keys": [
   "crema",
   "calabaza",
   "panela"
  ]
 },
 {
  "file": "crema-de-champinones.jpg",
  "label": "Crema de champinones",
  "keys": [
   "crema",
   "champinones"
  ]
 },
 {
  "file": "crema-de-chicharo-con-panela.jpg",
  "label": "Crema de chicharo con panela",
  "keys": [
   "crema",
   "chicharo",
   "panela"
  ]
 },
 {
  "file": "crema-de-coliflor-con-panela.jpg",
  "label": "Crema de coliflor con panela",
  "keys": [
   "crema",
   "coliflor",
   "panela"
  ]
 },
 {
  "file": "crema-de-elote-con-panela.jpg",
  "label": "Crema de elote con panela",
  "keys": [
   "crema",
   "elote",
   "panela"
  ]
 },
 {
  "file": "crema-de-espinaca-con-panela.jpg",
  "label": "Crema de espinaca con panela",
  "keys": [
   "crema",
   "espinaca",
   "panela"
  ]
 },
 {
  "file": "crema-de-flor-de-calabaza.jpg",
  "label": "Crema de flor de calabaza",
  "keys": [
   "crema",
   "flor",
   "calabaza"
  ]
 },
 {
  "file": "crema-de-poblano-con-panela.jpg",
  "label": "Crema de poblano con panela",
  "keys": [
   "crema",
   "poblano",
   "panela"
  ]
 },
 {
  "file": "crema-de-zanahoria-con-panela.jpg",
  "label": "Crema de zanahoria con panela",
  "keys": [
   "crema",
   "zanahoria",
   "panela"
  ]
 },
 {
  "file": "crema-de-zanahoria-y-jengibre.jpg",
  "label": "Crema de zanahoria y jengibre",
  "keys": [
   "crema",
   "zanahoria",
   "jengibre"
  ]
 },
 {
  "file": "cubos-de-panela-con-chile-y-limon.jpg",
  "label": "Cubos de panela con chile y limon",
  "keys": [
   "cubos",
   "panela",
   "chile",
   "limon"
  ]
 },
 {
  "file": "cubos-de-panela-con-chile.jpg",
  "label": "Cubos de panela con chile",
  "keys": [
   "cubos",
   "panela",
   "chile"
  ]
 },
 {
  "file": "discada-de-res-y-pollo.jpg",
  "label": "Discada de res y pollo",
  "keys": [
   "discada",
   "res",
   "pollo"
  ]
 },
 {
  "file": "edamames.jpg",
  "label": "Edamames",
  "keys": [
   "edamames"
  ]
 },
 {
  "file": "elote-desgranado-con-limon.jpg",
  "label": "Elote desgranado con limon",
  "keys": [
   "elote",
   "desgranado",
   "limon"
  ]
 },
 {
  "file": "enchiladas-divorciadas.jpg",
  "label": "Enchiladas divorciadas",
  "keys": [
   "enchiladas",
   "divorciadas"
  ]
 },
 {
  "file": "enchiladas.jpg",
  "label": "Enchiladas",
  "keys": [
   "enchiladas"
  ]
 },
 {
  "file": "ensalada-caprese-con-res.jpg",
  "label": "Ensalada caprese con res",
  "keys": [
   "ensalada",
   "caprese",
   "res"
  ]
 },
 {
  "file": "ensalada-cesar-con-res.jpg",
  "label": "Ensalada cesar con res",
  "keys": [
   "ensalada",
   "cesar",
   "res"
  ]
 },
 {
  "file": "ensalada-con-pasta-y-proteina.jpg",
  "label": "Ensalada con pasta y proteina",
  "keys": [
   "ensalada",
   "pasta",
   "proteina"
  ]
 },
 {
  "file": "ensalada-de-atun.jpg",
  "label": "Ensalada de atun",
  "keys": [
   "ensalada",
   "atun"
  ]
 },
 {
  "file": "ensalada-de-espinaca-con-res.jpg",
  "label": "Ensalada de espinaca con res",
  "keys": [
   "ensalada",
   "espinaca",
   "res"
  ]
 },
 {
  "file": "ensalada-de-kale-con-res.jpg",
  "label": "Ensalada de kale con res",
  "keys": [
   "ensalada",
   "kale",
   "res"
  ]
 },
 {
  "file": "ensalada-de-pollo-con-verduras.jpg",
  "label": "Ensalada de pollo con verduras",
  "keys": [
   "ensalada",
   "pollo",
   "verduras"
  ]
 },
 {
  "file": "ensalada-de-pollo.jpg",
  "label": "Ensalada de pollo",
  "keys": [
   "ensalada",
   "pollo"
  ]
 },
 {
  "file": "ensalada-de-quinoa-con-pavo.jpg",
  "label": "Ensalada de quinoa con pavo",
  "keys": [
   "ensalada",
   "quinoa",
   "pavo"
  ]
 },
 {
  "file": "ensalada-mediterranea-con-res.jpg",
  "label": "Ensalada mediterranea con res",
  "keys": [
   "ensalada",
   "mediterranea",
   "res"
  ]
 },
 {
  "file": "ensalada-mixta-con-res.jpg",
  "label": "Ensalada mixta con res",
  "keys": [
   "ensalada",
   "mixta",
   "res"
  ]
 },
 {
  "file": "ensalada-tricolor-estilo-griego.jpg",
  "label": "Ensalada tricolor estilo griego",
  "keys": [
   "ensalada",
   "tricolor",
   "griego"
  ]
 },
 {
  "file": "frijoles-charros.jpg",
  "label": "Frijoles charros",
  "keys": [
   "frijoles",
   "charros"
  ]
 },
 {
  "file": "fruta-arandano.jpg",
  "label": "Fruta arandano",
  "keys": [
   "fruta",
   "arandano"
  ],
  "fruta": true
 },
 {
  "file": "fruta-ciruela.jpg",
  "label": "Fruta ciruela",
  "keys": [
   "fruta",
   "ciruela"
  ],
  "fruta": true
 },
 {
  "file": "fruta-coco.jpg",
  "label": "Fruta coco",
  "keys": [
   "fruta",
   "coco"
  ],
  "fruta": true
 },
 {
  "file": "fruta-durazno.jpg",
  "label": "Fruta durazno",
  "keys": [
   "fruta",
   "durazno"
  ],
  "fruta": true
 },
 {
  "file": "fruta-fresa.jpg",
  "label": "Fruta fresa",
  "keys": [
   "fruta",
   "fresa"
  ],
  "fruta": true
 },
 {
  "file": "fruta-frutos-rojos.jpg",
  "label": "Fruta frutos rojos",
  "keys": [
   "fruta",
   "frutos",
   "rojos"
  ],
  "fruta": true
 },
 {
  "file": "fruta-guayaba.jpg",
  "label": "Fruta guayaba",
  "keys": [
   "fruta",
   "guayaba"
  ],
  "fruta": true
 },
 {
  "file": "fruta-kiwi.jpg",
  "label": "Fruta kiwi",
  "keys": [
   "fruta",
   "kiwi"
  ],
  "fruta": true
 },
 {
  "file": "fruta-mandarina.jpg",
  "label": "Fruta mandarina",
  "keys": [
   "fruta",
   "mandarina"
  ],
  "fruta": true
 },
 {
  "file": "fruta-manzana.jpg",
  "label": "Fruta manzana",
  "keys": [
   "fruta",
   "manzana"
  ],
  "fruta": true
 },
 {
  "file": "fruta-melon.jpg",
  "label": "Fruta melon",
  "keys": [
   "fruta",
   "melon"
  ],
  "fruta": true
 },
 {
  "file": "fruta-papaya.jpg",
  "label": "Fruta papaya",
  "keys": [
   "fruta",
   "papaya"
  ],
  "fruta": true
 },
 {
  "file": "fruta-pera.jpg",
  "label": "Fruta pera",
  "keys": [
   "fruta",
   "pera"
  ],
  "fruta": true
 },
 {
  "file": "fruta-pina.jpg",
  "label": "Fruta pina",
  "keys": [
   "fruta",
   "pina"
  ],
  "fruta": true
 },
 {
  "file": "fruta-platano.jpg",
  "label": "Fruta platano",
  "keys": [
   "fruta",
   "platano"
  ],
  "fruta": true
 },
 {
  "file": "fruta-sandia.jpg",
  "label": "Fruta sandia",
  "keys": [
   "fruta",
   "sandia"
  ],
  "fruta": true
 },
 {
  "file": "fruta-toronja.jpg",
  "label": "Fruta toronja",
  "keys": [
   "fruta",
   "toronja"
  ],
  "fruta": true
 },
 {
  "file": "fruta-tuna.jpg",
  "label": "Fruta tuna",
  "keys": [
   "fruta",
   "tuna"
  ],
  "fruta": true
 },
 {
  "file": "fruta-uva.jpg",
  "label": "Fruta uva",
  "keys": [
   "fruta",
   "uva"
  ],
  "fruta": true
 },
 {
  "file": "galletas-de-arroz-con-hummus.jpg",
  "label": "Galletas de arroz con hummus",
  "keys": [
   "galletas",
   "arroz",
   "hummus"
  ]
 },
 {
  "file": "granola-con-arandano.jpg",
  "label": "Granola con arandano",
  "keys": [
   "granola",
   "arandano"
  ]
 },
 {
  "file": "guayaba-natural.jpg",
  "label": "Guayaba natural",
  "keys": [
   "guayaba",
   "natural"
  ]
 },
 {
  "file": "guisado-de-res.jpg",
  "label": "Guisado de res",
  "keys": [
   "guisado",
   "res"
  ]
 },
 {
  "file": "higado-encebollado.jpg",
  "label": "Higado encebollado",
  "keys": [
   "higado",
   "encebollado"
  ]
 },
 {
  "file": "hot-cakes-con-fruta.jpg",
  "label": "Hot cakes con fruta",
  "keys": [
   "hot",
   "cakes",
   "fruta"
  ]
 },
 {
  "file": "huevo-con-costra-de-queso-feta.jpg",
  "label": "Huevo con costra de queso feta",
  "keys": [
   "huevo",
   "costra",
   "queso",
   "feta"
  ]
 },
 {
  "file": "huevo-con-pechuga-de-pavo.jpg",
  "label": "Huevo con pechuga de pavo",
  "keys": [
   "huevo",
   "pechuga",
   "pavo"
  ]
 },
 {
  "file": "huevo-duro-con-pepino.jpg",
  "label": "Huevo duro con pepino",
  "keys": [
   "huevo",
   "duro",
   "pepino"
  ]
 },
 {
  "file": "huevos-con-brocoli.jpg",
  "label": "Huevos con brocoli",
  "keys": [
   "huevos",
   "brocoli"
  ]
 },
 {
  "file": "huevos-con-ejote.jpg",
  "label": "Huevos con ejote",
  "keys": [
   "huevos",
   "ejote"
  ]
 },
 {
  "file": "huevos-en-salsa-roja.jpg",
  "label": "Huevos en salsa roja",
  "keys": [
   "huevos",
   "salsa",
   "roja"
  ]
 },
 {
  "file": "huevos-en-salsa-verde.jpg",
  "label": "Huevos en salsa verde",
  "keys": [
   "huevos",
   "salsa",
   "verde"
  ]
 },
 {
  "file": "huevos-estrellados.jpg",
  "label": "Huevos estrellados",
  "keys": [
   "huevos",
   "estrellados"
  ]
 },
 {
  "file": "huevos-revueltos.jpg",
  "label": "Huevos revueltos",
  "keys": [
   "huevos",
   "revueltos"
  ]
 },
 {
  "file": "index.json",
  "label": "Index",
  "keys": [
   "index"
  ]
 },
 {
  "file": "lentejas-guisadas.jpg",
  "label": "Lentejas guisadas",
  "keys": [
   "lentejas",
   "guisadas"
  ]
 },
 {
  "file": "lomo-de-cerdo-a-la-mexicana-con-arroz-y-ensalada.jpg",
  "label": "Lomo de cerdo a la mexicana con arroz y ensalada",
  "keys": [
   "lomo",
   "cerdo",
   "mexicana",
   "arroz",
   "ensalada"
  ]
 },
 {
  "file": "lomo-de-cerdo-a-la-mexicana-con-ensalada.jpg",
  "label": "Lomo de cerdo a la mexicana con ensalada",
  "keys": [
   "lomo",
   "cerdo",
   "mexicana",
   "ensalada"
  ]
 },
 {
  "file": "lomo-de-cerdo-a-la-mexicana-con-quinoa.jpg",
  "label": "Lomo de cerdo a la mexicana con quinoa",
  "keys": [
   "lomo",
   "cerdo",
   "mexicana",
   "quinoa"
  ]
 },
 {
  "file": "lomo-de-cerdo-a-la-naranja-con-camote-al-horno.jpg",
  "label": "Lomo de cerdo a la naranja con camote al horno",
  "keys": [
   "lomo",
   "cerdo",
   "naranja",
   "camote",
   "horno"
  ]
 },
 {
  "file": "lomo-de-cerdo-a-la-naranja-con-elote-y-calabaza.jpg",
  "label": "Lomo de cerdo a la naranja con elote y calabaza",
  "keys": [
   "lomo",
   "cerdo",
   "naranja",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "lomo-de-cerdo-a-la-naranja-con-pure-de-papa.jpg",
  "label": "Lomo de cerdo a la naranja con pure de papa",
  "keys": [
   "lomo",
   "cerdo",
   "naranja",
   "pure",
   "papa"
  ]
 },
 {
  "file": "lomo-de-cerdo-a-la-naranja-con-quinoa.jpg",
  "label": "Lomo de cerdo a la naranja con quinoa",
  "keys": [
   "lomo",
   "cerdo",
   "naranja",
   "quinoa"
  ]
 },
 {
  "file": "lomo-de-cerdo-a-la-plancha-con-arroz-y-ensalada.jpg",
  "label": "Lomo de cerdo a la plancha con arroz y ensalada",
  "keys": [
   "lomo",
   "cerdo",
   "plancha",
   "arroz",
   "ensalada"
  ]
 },
 {
  "file": "lomo-de-cerdo-a-la-plancha-con-arroz.jpg",
  "label": "Lomo de cerdo a la plancha con arroz",
  "keys": [
   "lomo",
   "cerdo",
   "plancha",
   "arroz"
  ]
 },
 {
  "file": "lomo-de-cerdo-a-las-finas-hierbas-con-calabacitas.jpg",
  "label": "Lomo de cerdo a las finas hierbas con calabacitas",
  "keys": [
   "lomo",
   "cerdo",
   "finas",
   "hierbas",
   "calabacitas"
  ]
 },
 {
  "file": "lomo-de-cerdo-a-las-finas-hierbas-con-camote-al-horno.jpg",
  "label": "Lomo de cerdo a las finas hierbas con camote al horno",
  "keys": [
   "lomo",
   "cerdo",
   "finas",
   "hierbas",
   "camote",
   "horno"
  ]
 },
 {
  "file": "lomo-de-cerdo-a-las-finas-hierbas-con-elote-y-calabaza.jpg",
  "label": "Lomo de cerdo a las finas hierbas con elote y calabaza",
  "keys": [
   "lomo",
   "cerdo",
   "finas",
   "hierbas",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "lomo-de-cerdo-a-las-finas-hierbas-con-pure-de-papa.jpg",
  "label": "Lomo de cerdo a las finas hierbas con pure de papa",
  "keys": [
   "lomo",
   "cerdo",
   "finas",
   "hierbas",
   "pure",
   "papa"
  ]
 },
 {
  "file": "lomo-de-cerdo-adobado-con-arroz-y-ensalada.jpg",
  "label": "Lomo de cerdo adobado con arroz y ensalada",
  "keys": [
   "lomo",
   "cerdo",
   "adobado",
   "arroz",
   "ensalada"
  ]
 },
 {
  "file": "lomo-de-cerdo-adobado-con-camote-al-horno.jpg",
  "label": "Lomo de cerdo adobado con camote al horno",
  "keys": [
   "lomo",
   "cerdo",
   "adobado",
   "camote",
   "horno"
  ]
 },
 {
  "file": "lomo-de-cerdo-adobado-con-quinoa.jpg",
  "label": "Lomo de cerdo adobado con quinoa",
  "keys": [
   "lomo",
   "cerdo",
   "adobado",
   "quinoa"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-ajillo-con-arroz.jpg",
  "label": "Lomo de cerdo al ajillo con arroz",
  "keys": [
   "lomo",
   "cerdo",
   "ajillo",
   "arroz"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-ajillo-con-ensalada.jpg",
  "label": "Lomo de cerdo al ajillo con ensalada",
  "keys": [
   "lomo",
   "cerdo",
   "ajillo",
   "ensalada"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-ajillo-con-quinoa-y-espinaca.jpg",
  "label": "Lomo de cerdo al ajillo con quinoa y espinaca",
  "keys": [
   "lomo",
   "cerdo",
   "ajillo",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-chipotle-con-camote-al-horno.jpg",
  "label": "Lomo de cerdo al chipotle con camote al horno",
  "keys": [
   "lomo",
   "cerdo",
   "chipotle",
   "camote",
   "horno"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-chipotle-con-pure-de-papa.jpg",
  "label": "Lomo de cerdo al chipotle con pure de papa",
  "keys": [
   "lomo",
   "cerdo",
   "chipotle",
   "pure",
   "papa"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-chipotle-con-quinoa-y-espinaca.jpg",
  "label": "Lomo de cerdo al chipotle con quinoa y espinaca",
  "keys": [
   "lomo",
   "cerdo",
   "chipotle",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-chipotle-con-quinoa.jpg",
  "label": "Lomo de cerdo al chipotle con quinoa",
  "keys": [
   "lomo",
   "cerdo",
   "chipotle",
   "quinoa"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-curry-con-arroz-con-calabacitas.jpg",
  "label": "Lomo de cerdo al curry con arroz con calabacitas",
  "keys": [
   "lomo",
   "cerdo",
   "curry",
   "arroz",
   "calabacitas"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-curry-con-arroz-con-esparragos.jpg",
  "label": "Lomo de cerdo al curry con arroz con esparragos",
  "keys": [
   "lomo",
   "cerdo",
   "curry",
   "arroz",
   "esparragos"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-curry-con-arroz-y-ensalada.jpg",
  "label": "Lomo de cerdo al curry con arroz y ensalada",
  "keys": [
   "lomo",
   "cerdo",
   "curry",
   "arroz",
   "ensalada"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-curry-con-arroz.jpg",
  "label": "Lomo de cerdo al curry con arroz",
  "keys": [
   "lomo",
   "cerdo",
   "curry",
   "arroz"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-horno-con-especias-con-camote-al-horno.jpg",
  "label": "Lomo de cerdo al horno con especias con camote al horno",
  "keys": [
   "lomo",
   "cerdo",
   "horno",
   "especias",
   "camote"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-horno-con-especias-con-pure-de-papa.jpg",
  "label": "Lomo de cerdo al horno con especias con pure de papa",
  "keys": [
   "lomo",
   "cerdo",
   "horno",
   "especias",
   "pure",
   "papa"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-horno-con-especias-con-quinoa-y-espinaca.jpg",
  "label": "Lomo de cerdo al horno con especias con quinoa y espinaca",
  "keys": [
   "lomo",
   "cerdo",
   "horno",
   "especias",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-horno-con-especias-con-quinoa.jpg",
  "label": "Lomo de cerdo al horno con especias con quinoa",
  "keys": [
   "lomo",
   "cerdo",
   "horno",
   "especias",
   "quinoa"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-pastor-con-arroz.jpg",
  "label": "Lomo de cerdo al pastor con arroz",
  "keys": [
   "lomo",
   "cerdo",
   "pastor",
   "arroz"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-pastor-con-calabacitas.jpg",
  "label": "Lomo de cerdo al pastor con calabacitas",
  "keys": [
   "lomo",
   "cerdo",
   "pastor",
   "calabacitas"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-pastor-con-esparragos.jpg",
  "label": "Lomo de cerdo al pastor con esparragos",
  "keys": [
   "lomo",
   "cerdo",
   "pastor",
   "esparragos"
  ]
 },
 {
  "file": "lomo-de-cerdo-al-pastor-con-quinoa-y-espinaca.jpg",
  "label": "Lomo de cerdo al pastor con quinoa y espinaca",
  "keys": [
   "lomo",
   "cerdo",
   "pastor",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "lomo-de-cerdo-empanizado-al-horno-con-elote-y-calabaza.jpg",
  "label": "Lomo de cerdo empanizado al horno con elote y calabaza",
  "keys": [
   "lomo",
   "cerdo",
   "empanizado",
   "horno",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "lomo-de-cerdo-empanizado-al-horno-con-ensalada.jpg",
  "label": "Lomo de cerdo empanizado al horno con ensalada",
  "keys": [
   "lomo",
   "cerdo",
   "empanizado",
   "horno",
   "ensalada"
  ]
 },
 {
  "file": "lomo-de-cerdo-empanizado-al-horno-con-quinoa.jpg",
  "label": "Lomo de cerdo empanizado al horno con quinoa",
  "keys": [
   "lomo",
   "cerdo",
   "empanizado",
   "horno",
   "quinoa"
  ]
 },
 {
  "file": "lomo-de-cerdo-en-pipian-verde-con-arroz-y-ensalada.jpg",
  "label": "Lomo de cerdo en pipian verde con arroz y ensalada",
  "keys": [
   "lomo",
   "cerdo",
   "pipian",
   "verde",
   "arroz",
   "ensalada"
  ]
 },
 {
  "file": "lomo-de-cerdo-en-pipian-verde-con-arroz.jpg",
  "label": "Lomo de cerdo en pipian verde con arroz",
  "keys": [
   "lomo",
   "cerdo",
   "pipian",
   "verde",
   "arroz"
  ]
 },
 {
  "file": "lomo-de-cerdo-en-pipian-verde-con-ensalada.jpg",
  "label": "Lomo de cerdo en pipian verde con ensalada",
  "keys": [
   "lomo",
   "cerdo",
   "pipian",
   "verde",
   "ensalada"
  ]
 },
 {
  "file": "lomo-de-cerdo-en-salsa-bbq-ligera-con-ensalada.jpg",
  "label": "Lomo de cerdo en salsa bbq ligera con ensalada",
  "keys": [
   "lomo",
   "cerdo",
   "salsa",
   "bbq",
   "ligera",
   "ensalada"
  ]
 },
 {
  "file": "lomo-de-cerdo-en-salsa-bbq-ligera-con-quinoa-y-espinaca.jpg",
  "label": "Lomo de cerdo en salsa bbq ligera con quinoa y espinaca",
  "keys": [
   "lomo",
   "cerdo",
   "salsa",
   "bbq",
   "ligera",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "lomo-de-cerdo-en-salsa-bbq-ligera-con-quinoa.jpg",
  "label": "Lomo de cerdo en salsa bbq ligera con quinoa",
  "keys": [
   "lomo",
   "cerdo",
   "salsa",
   "bbq",
   "ligera",
   "quinoa"
  ]
 },
 {
  "file": "lomo-de-cerdo-en-salsa-de-champinones-con-elote-y-calabaza.jpg",
  "label": "Lomo de cerdo en salsa de champinones con elote y calabaza",
  "keys": [
   "lomo",
   "cerdo",
   "salsa",
   "champinones",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "lomo-de-cerdo-en-salsa-de-champinones-con-ensalada.jpg",
  "label": "Lomo de cerdo en salsa de champinones con ensalada",
  "keys": [
   "lomo",
   "cerdo",
   "salsa",
   "champinones",
   "ensalada"
  ]
 },
 {
  "file": "lomo-de-cerdo-encebollado-con-calabacitas.jpg",
  "label": "Lomo de cerdo encebollado con calabacitas",
  "keys": [
   "lomo",
   "cerdo",
   "encebollado",
   "calabacitas"
  ]
 },
 {
  "file": "lomo-de-cerdo-encebollado-con-camote-al-horno.jpg",
  "label": "Lomo de cerdo encebollado con camote al horno",
  "keys": [
   "lomo",
   "cerdo",
   "encebollado",
   "camote",
   "horno"
  ]
 },
 {
  "file": "lomo-de-cerdo-encebollado-con-esparragos.jpg",
  "label": "Lomo de cerdo encebollado con esparragos",
  "keys": [
   "lomo",
   "cerdo",
   "encebollado",
   "esparragos"
  ]
 },
 {
  "file": "lomo-de-cerdo-encebollado-con-pure-de-papa.jpg",
  "label": "Lomo de cerdo encebollado con pure de papa",
  "keys": [
   "lomo",
   "cerdo",
   "encebollado",
   "pure",
   "papa"
  ]
 },
 {
  "file": "lomo-de-cerdo-encebollado-con-quinoa-y-espinaca.jpg",
  "label": "Lomo de cerdo encebollado con quinoa y espinaca",
  "keys": [
   "lomo",
   "cerdo",
   "encebollado",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "mandarina-natural.jpg",
  "label": "Mandarina natural",
  "keys": [
   "mandarina",
   "natural"
  ]
 },
 {
  "file": "mega-gringa-de-pan-pita.jpg",
  "label": "Mega gringa de pan pita",
  "keys": [
   "mega",
   "gringa",
   "pan",
   "pita"
  ]
 },
 {
  "file": "melon-con-almendra.jpg",
  "label": "Melon con almendra",
  "keys": [
   "melon",
   "almendra"
  ]
 },
 {
  "file": "melon-con-chile-y-limon.jpg",
  "label": "Melon con chile y limon",
  "keys": [
   "melon",
   "chile",
   "limon"
  ]
 },
 {
  "file": "milanesa-de-pollo.jpg",
  "label": "Milanesa de pollo",
  "keys": [
   "milanesa",
   "pollo"
  ]
 },
 {
  "file": "milanesa-de-res-al-horno.jpg",
  "label": "Milanesa de res al horno",
  "keys": [
   "milanesa",
   "res",
   "horno"
  ]
 },
 {
  "file": "mix-de-frutos-secos.jpg",
  "label": "Mix de frutos secos",
  "keys": [
   "mix",
   "frutos",
   "secos"
  ]
 },
 {
  "file": "molletes.jpg",
  "label": "Molletes",
  "keys": [
   "molletes"
  ]
 },
 {
  "file": "nopal-asado.jpg",
  "label": "Nopal asado",
  "keys": [
   "nopal",
   "asado"
  ]
 },
 {
  "file": "nopales-con-frijol.jpg",
  "label": "Nopales con frijol",
  "keys": [
   "nopales",
   "frijol"
  ]
 },
 {
  "file": "omelette-con-frijol.jpg",
  "label": "Omelette con frijol",
  "keys": [
   "omelette",
   "frijol"
  ]
 },
 {
  "file": "omelette.jpg",
  "label": "Omelette",
  "keys": [
   "omelette"
  ]
 },
 {
  "file": "pan-pita-con-panela-y-champinon.jpg",
  "label": "Pan pita con panela y champinon",
  "keys": [
   "pan",
   "pita",
   "panela",
   "champinon"
  ]
 },
 {
  "file": "pan-pita-de-salmon.jpg",
  "label": "Pan pita de salmon",
  "keys": [
   "pan",
   "pita",
   "salmon"
  ]
 },
 {
  "file": "pan-tostado-con-burrata-y-cherry.jpg",
  "label": "Pan tostado con burrata y cherry",
  "keys": [
   "pan",
   "tostado",
   "burrata",
   "cherry"
  ]
 },
 {
  "file": "panela-asado-con-salsa.jpg",
  "label": "Panela asado con salsa",
  "keys": [
   "panela",
   "asado",
   "salsa"
  ]
 },
 {
  "file": "panque-proteico-de-platano.jpg",
  "label": "Panque proteico de platano",
  "keys": [
   "panque",
   "platano"
  ]
 },
 {
  "file": "papa-horneada-rellena.jpg",
  "label": "Papa horneada rellena",
  "keys": [
   "papa",
   "horneada",
   "rellena"
  ]
 },
 {
  "file": "pasta-con-pollo.jpg",
  "label": "Pasta con pollo",
  "keys": [
   "pasta",
   "pollo"
  ]
 },
 {
  "file": "pasta-con-salsa-de-tomate-y-atun.jpg",
  "label": "Pasta con salsa de tomate y atun",
  "keys": [
   "pasta",
   "salsa",
   "tomate",
   "atun"
  ]
 },
 {
  "file": "pasta-integral.jpg",
  "label": "Pasta integral",
  "keys": [
   "pasta",
   "integral"
  ]
 },
 {
  "file": "pavo-a-la-naranja-con-camote-al-horno.jpg",
  "label": "Pavo a la naranja con camote al horno",
  "keys": [
   "pavo",
   "naranja",
   "camote",
   "horno"
  ]
 },
 {
  "file": "pavo-a-la-naranja-con-elote-y-calabaza.jpg",
  "label": "Pavo a la naranja con elote y calabaza",
  "keys": [
   "pavo",
   "naranja",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "pavo-a-la-naranja-con-pure-de-papa.jpg",
  "label": "Pavo a la naranja con pure de papa",
  "keys": [
   "pavo",
   "naranja",
   "pure",
   "papa"
  ]
 },
 {
  "file": "pavo-a-la-plancha-con-arroz.jpg",
  "label": "Pavo a la plancha con arroz",
  "keys": [
   "pavo",
   "plancha",
   "arroz"
  ]
 },
 {
  "file": "pavo-a-las-finas-hierbas-con-calabacitas.jpg",
  "label": "Pavo a las finas hierbas con calabacitas",
  "keys": [
   "pavo",
   "finas",
   "hierbas",
   "calabacitas"
  ]
 },
 {
  "file": "pavo-a-las-finas-hierbas-con-camote-al-horno.jpg",
  "label": "Pavo a las finas hierbas con camote al horno",
  "keys": [
   "pavo",
   "finas",
   "hierbas",
   "camote",
   "horno"
  ]
 },
 {
  "file": "pavo-a-las-finas-hierbas-con-elote-y-calabaza.jpg",
  "label": "Pavo a las finas hierbas con elote y calabaza",
  "keys": [
   "pavo",
   "finas",
   "hierbas",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "pavo-a-las-finas-hierbas-con-esparragos.jpg",
  "label": "Pavo a las finas hierbas con esparragos",
  "keys": [
   "pavo",
   "finas",
   "hierbas",
   "esparragos"
  ]
 },
 {
  "file": "pavo-a-las-finas-hierbas-con-pure-de-papa.jpg",
  "label": "Pavo a las finas hierbas con pure de papa",
  "keys": [
   "pavo",
   "finas",
   "hierbas",
   "pure",
   "papa"
  ]
 },
 {
  "file": "pavo-adobado-con-camote-al-horno.jpg",
  "label": "Pavo adobado con camote al horno",
  "keys": [
   "pavo",
   "adobado",
   "camote",
   "horno"
  ]
 },
 {
  "file": "pavo-adobado-con-pure-de-papa.jpg",
  "label": "Pavo adobado con pure de papa",
  "keys": [
   "pavo",
   "adobado",
   "pure",
   "papa"
  ]
 },
 {
  "file": "pavo-al-ajillo-con-arroz.jpg",
  "label": "Pavo al ajillo con arroz",
  "keys": [
   "pavo",
   "ajillo",
   "arroz"
  ]
 },
 {
  "file": "pavo-al-chipotle-con-camote-al-horno.jpg",
  "label": "Pavo al chipotle con camote al horno",
  "keys": [
   "pavo",
   "chipotle",
   "camote",
   "horno"
  ]
 },
 {
  "file": "pavo-al-chipotle-con-pure-de-papa.jpg",
  "label": "Pavo al chipotle con pure de papa",
  "keys": [
   "pavo",
   "chipotle",
   "pure",
   "papa"
  ]
 },
 {
  "file": "pavo-al-curry-con-arroz.jpg",
  "label": "Pavo al curry con arroz",
  "keys": [
   "pavo",
   "curry",
   "arroz"
  ]
 },
 {
  "file": "pavo-al-curry-con-calabacitas.jpg",
  "label": "Pavo al curry con calabacitas",
  "keys": [
   "pavo",
   "curry",
   "calabacitas"
  ]
 },
 {
  "file": "pavo-al-curry-con-esparragos.jpg",
  "label": "Pavo al curry con esparragos",
  "keys": [
   "pavo",
   "curry",
   "esparragos"
  ]
 },
 {
  "file": "pavo-al-horno-con-especias-con-camote-al-horno.jpg",
  "label": "Pavo al horno con especias con camote al horno",
  "keys": [
   "pavo",
   "horno",
   "especias",
   "camote"
  ]
 },
 {
  "file": "pavo-al-horno-con-especias-con-pure-de-papa.jpg",
  "label": "Pavo al horno con especias con pure de papa",
  "keys": [
   "pavo",
   "horno",
   "especias",
   "pure",
   "papa"
  ]
 },
 {
  "file": "pavo-al-pastor-con-arroz.jpg",
  "label": "Pavo al pastor con arroz",
  "keys": [
   "pavo",
   "pastor",
   "arroz"
  ]
 },
 {
  "file": "pavo-al-pastor-con-calabacitas.jpg",
  "label": "Pavo al pastor con calabacitas",
  "keys": [
   "pavo",
   "pastor",
   "calabacitas"
  ]
 },
 {
  "file": "pavo-al-pastor-con-esparragos.jpg",
  "label": "Pavo al pastor con esparragos",
  "keys": [
   "pavo",
   "pastor",
   "esparragos"
  ]
 },
 {
  "file": "pavo-con-calabacitas-a-la-mexicana.jpg",
  "label": "Pavo con calabacitas a la mexicana",
  "keys": [
   "pavo",
   "calabacitas",
   "mexicana"
  ]
 },
 {
  "file": "pavo-con-camote-al-horno.jpg",
  "label": "Pavo con camote al horno",
  "keys": [
   "pavo",
   "camote",
   "horno"
  ]
 },
 {
  "file": "pavo-con-pure-de-papa.jpg",
  "label": "Pavo con pure de papa",
  "keys": [
   "pavo",
   "pure",
   "papa"
  ]
 },
 {
  "file": "pavo-empanizado-al-horno-con-elote-y-calabaza.jpg",
  "label": "Pavo empanizado al horno con elote y calabaza",
  "keys": [
   "pavo",
   "empanizado",
   "horno",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "pavo-en-pipian-verde-con-arroz.jpg",
  "label": "Pavo en pipian verde con arroz",
  "keys": [
   "pavo",
   "pipian",
   "verde",
   "arroz"
  ]
 },
 {
  "file": "pavo-en-salsa-de-champinones-con-arroz.jpg",
  "label": "Pavo en salsa de champinones con arroz",
  "keys": [
   "pavo",
   "salsa",
   "champinones",
   "arroz"
  ]
 },
 {
  "file": "pavo-en-salsa-de-champinones-con-elote-y-calabaza.jpg",
  "label": "Pavo en salsa de champinones con elote y calabaza",
  "keys": [
   "pavo",
   "salsa",
   "champinones",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "pavo-encebollado-con-calabacitas.jpg",
  "label": "Pavo encebollado con calabacitas",
  "keys": [
   "pavo",
   "encebollado",
   "calabacitas"
  ]
 },
 {
  "file": "pavo-encebollado-con-camote-al-horno.jpg",
  "label": "Pavo encebollado con camote al horno",
  "keys": [
   "pavo",
   "encebollado",
   "camote",
   "horno"
  ]
 },
 {
  "file": "pavo-encebollado-con-esparragos.jpg",
  "label": "Pavo encebollado con esparragos",
  "keys": [
   "pavo",
   "encebollado",
   "esparragos"
  ]
 },
 {
  "file": "pavo-encebollado-con-pure-de-papa.jpg",
  "label": "Pavo encebollado con pure de papa",
  "keys": [
   "pavo",
   "encebollado",
   "pure",
   "papa"
  ]
 },
 {
  "file": "pechuga-de-pavo-asada.jpg",
  "label": "Pechuga de pavo asada",
  "keys": [
   "pechuga",
   "pavo",
   "asada"
  ]
 },
 {
  "file": "pechuga-rellena-de-espinaca-y-panela.jpg",
  "label": "Pechuga rellena de espinaca y panela",
  "keys": [
   "pechuga",
   "rellena",
   "espinaca",
   "panela"
  ]
 },
 {
  "file": "pepino-con-queso-cottage.jpg",
  "label": "Pepino con queso cottage",
  "keys": [
   "pepino",
   "queso",
   "cottage"
  ]
 },
 {
  "file": "pescado-a-la-plancha.jpg",
  "label": "Pescado a la plancha",
  "keys": [
   "pescado",
   "plancha"
  ]
 },
 {
  "file": "pescado-a-la-veracruzana-con-calabacitas.jpg",
  "label": "Pescado a la veracruzana con calabacitas",
  "keys": [
   "pescado",
   "veracruzana",
   "calabacitas"
  ]
 },
 {
  "file": "pescado-a-la-veracruzana-con-elote-y-calabaza.jpg",
  "label": "Pescado a la veracruzana con elote y calabaza",
  "keys": [
   "pescado",
   "veracruzana",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "pescado-a-la-veracruzana-con-esparragos.jpg",
  "label": "Pescado a la veracruzana con esparragos",
  "keys": [
   "pescado",
   "veracruzana",
   "esparragos"
  ]
 },
 {
  "file": "pescado-a-las-finas-hierbas-con-camote-al-horno.jpg",
  "label": "Pescado a las finas hierbas con camote al horno",
  "keys": [
   "pescado",
   "finas",
   "hierbas",
   "camote",
   "horno"
  ]
 },
 {
  "file": "pescado-a-las-finas-hierbas-con-quinoa.jpg",
  "label": "Pescado a las finas hierbas con quinoa",
  "keys": [
   "pescado",
   "finas",
   "hierbas",
   "quinoa"
  ]
 },
 {
  "file": "pescado-al-chipotle-con-calabacitas.jpg",
  "label": "Pescado al chipotle con calabacitas",
  "keys": [
   "pescado",
   "chipotle",
   "calabacitas"
  ]
 },
 {
  "file": "pescado-al-chipotle-con-camote-al-horno.jpg",
  "label": "Pescado al chipotle con camote al horno",
  "keys": [
   "pescado",
   "chipotle",
   "camote",
   "horno"
  ]
 },
 {
  "file": "pescado-al-chipotle-con-esparragos.jpg",
  "label": "Pescado al chipotle con esparragos",
  "keys": [
   "pescado",
   "chipotle",
   "esparragos"
  ]
 },
 {
  "file": "pescado-al-chipotle-con-quinoa-y-espinaca.jpg",
  "label": "Pescado al chipotle con quinoa y espinaca",
  "keys": [
   "pescado",
   "chipotle",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "pescado-al-curry-con-elote-y-calabaza.jpg",
  "label": "Pescado al curry con elote y calabaza",
  "keys": [
   "pescado",
   "curry",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "pescado-al-curry-con-quinoa.jpg",
  "label": "Pescado al curry con quinoa",
  "keys": [
   "pescado",
   "curry",
   "quinoa"
  ]
 },
 {
  "file": "pescado-con-camote-al-horno.jpg",
  "label": "Pescado con camote al horno",
  "keys": [
   "pescado",
   "camote",
   "horno"
  ]
 },
 {
  "file": "pescado-con-quinoa-y-espinaca.jpg",
  "label": "Pescado con quinoa y espinaca",
  "keys": [
   "pescado",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "pescado-empanizado-al-horno-con-calabacitas.jpg",
  "label": "Pescado empanizado al horno con calabacitas",
  "keys": [
   "pescado",
   "empanizado",
   "horno",
   "calabacitas"
  ]
 },
 {
  "file": "pescado-empanizado-al-horno-con-camote-al-horno.jpg",
  "label": "Pescado empanizado al horno con camote al horno",
  "keys": [
   "pescado",
   "empanizado",
   "horno",
   "camote"
  ]
 },
 {
  "file": "pescado-empanizado-al-horno-con-esparragos.jpg",
  "label": "Pescado empanizado al horno con esparragos",
  "keys": [
   "pescado",
   "empanizado",
   "horno",
   "esparragos"
  ]
 },
 {
  "file": "pescado-empapelado-con-quinoa.jpg",
  "label": "Pescado empapelado con quinoa",
  "keys": [
   "pescado",
   "empapelado",
   "quinoa"
  ]
 },
 {
  "file": "pescado-en-costra-de-ajonjoli-con-quinoa-y-espinaca.jpg",
  "label": "Pescado en costra de ajonjoli con quinoa y espinaca",
  "keys": [
   "pescado",
   "costra",
   "ajonjoli",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "pescado-en-salsa-de-mango-con-elote-y-calabaza.jpg",
  "label": "Pescado en salsa de mango con elote y calabaza",
  "keys": [
   "pescado",
   "salsa",
   "mango",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "pescado-zarandeado-con-calabacitas.jpg",
  "label": "Pescado zarandeado con calabacitas",
  "keys": [
   "pescado",
   "zarandeado",
   "calabacitas"
  ]
 },
 {
  "file": "pescado-zarandeado-con-esparragos.jpg",
  "label": "Pescado zarandeado con esparragos",
  "keys": [
   "pescado",
   "zarandeado",
   "esparragos"
  ]
 },
 {
  "file": "pescado-zarandeado-con-quinoa-y-espinaca.jpg",
  "label": "Pescado zarandeado con quinoa y espinaca",
  "keys": [
   "pescado",
   "zarandeado",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "pimiento-relleno-de-pavo.jpg",
  "label": "Pimiento relleno de pavo",
  "keys": [
   "pimiento",
   "relleno",
   "pavo"
  ]
 },
 {
  "file": "pina-con-chile-y-limon.jpg",
  "label": "Pina con chile y limon",
  "keys": [
   "pina",
   "chile",
   "limon"
  ]
 },
 {
  "file": "pita-con-pavo-y-huevo.jpg",
  "label": "Pita con pavo y huevo",
  "keys": [
   "pita",
   "pavo",
   "huevo"
  ]
 },
 {
  "file": "platano-congelado-con-cacao.jpg",
  "label": "Platano congelado con cacao",
  "keys": [
   "platano",
   "congelado",
   "cacao"
  ]
 },
 {
  "file": "poke-bowl-de-salmon.jpg",
  "label": "Poke bowl de salmon",
  "keys": [
   "poke",
   "bowl",
   "salmon"
  ]
 },
 {
  "file": "poke-bowl-de-tofu.jpg",
  "label": "Poke bowl de tofu",
  "keys": [
   "poke",
   "bowl",
   "tofu"
  ]
 },
 {
  "file": "pollo-a-la-naranja-con-camote-al-horno.jpg",
  "label": "Pollo a la naranja con camote al horno",
  "keys": [
   "pollo",
   "naranja",
   "camote",
   "horno"
  ]
 },
 {
  "file": "pollo-a-la-naranja-con-elote-y-calabaza.jpg",
  "label": "Pollo a la naranja con elote y calabaza",
  "keys": [
   "pollo",
   "naranja",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "pollo-a-la-naranja-con-pure-de-papa.jpg",
  "label": "Pollo a la naranja con pure de papa",
  "keys": [
   "pollo",
   "naranja",
   "pure",
   "papa"
  ]
 },
 {
  "file": "pollo-a-las-finas-hierbas-con-calabacitas.jpg",
  "label": "Pollo a las finas hierbas con calabacitas",
  "keys": [
   "pollo",
   "finas",
   "hierbas",
   "calabacitas"
  ]
 },
 {
  "file": "pollo-a-las-finas-hierbas-con-camote-al-horno.jpg",
  "label": "Pollo a las finas hierbas con camote al horno",
  "keys": [
   "pollo",
   "finas",
   "hierbas",
   "camote",
   "horno"
  ]
 },
 {
  "file": "pollo-a-las-finas-hierbas-con-esparragos.jpg",
  "label": "Pollo a las finas hierbas con esparragos",
  "keys": [
   "pollo",
   "finas",
   "hierbas",
   "esparragos"
  ]
 },
 {
  "file": "pollo-a-las-finas-hierbas-con-pure-de-papa.jpg",
  "label": "Pollo a las finas hierbas con pure de papa",
  "keys": [
   "pollo",
   "finas",
   "hierbas",
   "pure",
   "papa"
  ]
 },
 {
  "file": "pollo-adobado-con-camote-al-horno.jpg",
  "label": "Pollo adobado con camote al horno",
  "keys": [
   "pollo",
   "adobado",
   "camote",
   "horno"
  ]
 },
 {
  "file": "pollo-adobado-con-pure-de-papa.jpg",
  "label": "Pollo adobado con pure de papa",
  "keys": [
   "pollo",
   "adobado",
   "pure",
   "papa"
  ]
 },
 {
  "file": "pollo-al-chipotle-con-camote-al-horno.jpg",
  "label": "Pollo al chipotle con camote al horno",
  "keys": [
   "pollo",
   "chipotle",
   "camote",
   "horno"
  ]
 },
 {
  "file": "pollo-al-chipotle-con-pure-de-papa.jpg",
  "label": "Pollo al chipotle con pure de papa",
  "keys": [
   "pollo",
   "chipotle",
   "pure",
   "papa"
  ]
 },
 {
  "file": "pollo-al-curry-con-calabacitas.jpg",
  "label": "Pollo al curry con calabacitas",
  "keys": [
   "pollo",
   "curry",
   "calabacitas"
  ]
 },
 {
  "file": "pollo-al-curry-con-esparragos.jpg",
  "label": "Pollo al curry con esparragos",
  "keys": [
   "pollo",
   "curry",
   "esparragos"
  ]
 },
 {
  "file": "pollo-al-horno-con-especias-con-camote-al-horno.jpg",
  "label": "Pollo al horno con especias con camote al horno",
  "keys": [
   "pollo",
   "horno",
   "especias",
   "camote"
  ]
 },
 {
  "file": "pollo-al-horno-con-especias-con-pure-de-papa.jpg",
  "label": "Pollo al horno con especias con pure de papa",
  "keys": [
   "pollo",
   "horno",
   "especias",
   "pure",
   "papa"
  ]
 },
 {
  "file": "pollo-al-pastor-con-calabacitas.jpg",
  "label": "Pollo al pastor con calabacitas",
  "keys": [
   "pollo",
   "pastor",
   "calabacitas"
  ]
 },
 {
  "file": "pollo-al-pastor-con-esparragos.jpg",
  "label": "Pollo al pastor con esparragos",
  "keys": [
   "pollo",
   "pastor",
   "esparragos"
  ]
 },
 {
  "file": "pollo-con-calabacitas-a-la-mexicana.jpg",
  "label": "Pollo con calabacitas a la mexicana",
  "keys": [
   "pollo",
   "calabacitas",
   "mexicana"
  ]
 },
 {
  "file": "pollo-con-camote-al-horno.jpg",
  "label": "Pollo con camote al horno",
  "keys": [
   "pollo",
   "camote",
   "horno"
  ]
 },
 {
  "file": "pollo-con-pure-de-papa.jpg",
  "label": "Pollo con pure de papa",
  "keys": [
   "pollo",
   "pure",
   "papa"
  ]
 },
 {
  "file": "pollo-en-salsa-de-champinones-con-elote-y-calabaza.jpg",
  "label": "Pollo en salsa de champinones con elote y calabaza",
  "keys": [
   "pollo",
   "salsa",
   "champinones",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "pollo-encebollado-con-calabacitas.jpg",
  "label": "Pollo encebollado con calabacitas",
  "keys": [
   "pollo",
   "encebollado",
   "calabacitas"
  ]
 },
 {
  "file": "pollo-encebollado-con-camote-al-horno.jpg",
  "label": "Pollo encebollado con camote al horno",
  "keys": [
   "pollo",
   "encebollado",
   "camote",
   "horno"
  ]
 },
 {
  "file": "pollo-encebollado-con-esparragos.jpg",
  "label": "Pollo encebollado con esparragos",
  "keys": [
   "pollo",
   "encebollado",
   "esparragos"
  ]
 },
 {
  "file": "pollo-encebollado-con-pure-de-papa.jpg",
  "label": "Pollo encebollado con pure de papa",
  "keys": [
   "pollo",
   "encebollado",
   "pure",
   "papa"
  ]
 },
 {
  "file": "pollo-y-papa-al-vapor.jpg",
  "label": "Pollo y papa al vapor",
  "keys": [
   "pollo",
   "papa",
   "vapor"
  ]
 },
 {
  "file": "pure-de-camote.jpg",
  "label": "Pure de camote",
  "keys": [
   "pure",
   "camote"
  ]
 },
 {
  "file": "quesadilla-con-aguacate.jpg",
  "label": "Quesadilla con aguacate",
  "keys": [
   "quesadilla",
   "aguacate"
  ]
 },
 {
  "file": "quesadillas-de-champinones.jpg",
  "label": "Quesadillas de champinones",
  "keys": [
   "quesadillas",
   "champinones"
  ]
 },
 {
  "file": "quesadillas-de-rajas.jpg",
  "label": "Quesadillas de rajas",
  "keys": [
   "quesadillas",
   "rajas"
  ]
 },
 {
  "file": "quesadillas.jpg",
  "label": "Quesadillas",
  "keys": [
   "quesadillas"
  ]
 },
 {
  "file": "requeson-con-nuez-y-miel.jpg",
  "label": "Requeson con nuez y miel",
  "keys": [
   "requeson",
   "nuez",
   "miel"
  ]
 },
 {
  "file": "res-a-la-mexicana-con-arroz-y-ensalada.jpg",
  "label": "Res a la mexicana con arroz y ensalada",
  "keys": [
   "res",
   "mexicana",
   "arroz",
   "ensalada"
  ]
 },
 {
  "file": "res-a-la-mexicana-con-ensalada.jpg",
  "label": "Res a la mexicana con ensalada",
  "keys": [
   "res",
   "mexicana",
   "ensalada"
  ]
 },
 {
  "file": "res-a-la-mexicana-con-quinoa.jpg",
  "label": "Res a la mexicana con quinoa",
  "keys": [
   "res",
   "mexicana",
   "quinoa"
  ]
 },
 {
  "file": "res-a-la-naranja-con-camote-al-horno.jpg",
  "label": "Res a la naranja con camote al horno",
  "keys": [
   "res",
   "naranja",
   "camote",
   "horno"
  ]
 },
 {
  "file": "res-a-la-naranja-con-elote-y-calabaza.jpg",
  "label": "Res a la naranja con elote y calabaza",
  "keys": [
   "res",
   "naranja",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "res-a-la-naranja-con-pure-de-papa.jpg",
  "label": "Res a la naranja con pure de papa",
  "keys": [
   "res",
   "naranja",
   "pure",
   "papa"
  ]
 },
 {
  "file": "res-a-la-naranja-con-quinoa.jpg",
  "label": "Res a la naranja con quinoa",
  "keys": [
   "res",
   "naranja",
   "quinoa"
  ]
 },
 {
  "file": "res-a-la-plancha.jpg",
  "label": "Res a la plancha",
  "keys": [
   "res",
   "plancha"
  ]
 },
 {
  "file": "res-a-las-finas-hierbas-con-calabacitas.jpg",
  "label": "Res a las finas hierbas con calabacitas",
  "keys": [
   "res",
   "finas",
   "hierbas",
   "calabacitas"
  ]
 },
 {
  "file": "res-a-las-finas-hierbas-con-camote-al-horno.jpg",
  "label": "Res a las finas hierbas con camote al horno",
  "keys": [
   "res",
   "finas",
   "hierbas",
   "camote",
   "horno"
  ]
 },
 {
  "file": "res-a-las-finas-hierbas-con-elote-y-calabaza.jpg",
  "label": "Res a las finas hierbas con elote y calabaza",
  "keys": [
   "res",
   "finas",
   "hierbas",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "res-a-las-finas-hierbas-con-pure-de-papa.jpg",
  "label": "Res a las finas hierbas con pure de papa",
  "keys": [
   "res",
   "finas",
   "hierbas",
   "pure",
   "papa"
  ]
 },
 {
  "file": "res-adobado-con-arroz-y-ensalada.jpg",
  "label": "Res adobado con arroz y ensalada",
  "keys": [
   "res",
   "adobado",
   "arroz",
   "ensalada"
  ]
 },
 {
  "file": "res-al-ajillo-con-ensalada.jpg",
  "label": "Res al ajillo con ensalada",
  "keys": [
   "res",
   "ajillo",
   "ensalada"
  ]
 },
 {
  "file": "res-al-ajillo-con-quinoa-y-espinaca.jpg",
  "label": "Res al ajillo con quinoa y espinaca",
  "keys": [
   "res",
   "ajillo",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "res-al-chipotle-con-camote-al-horno.jpg",
  "label": "Res al chipotle con camote al horno",
  "keys": [
   "res",
   "chipotle",
   "camote",
   "horno"
  ]
 },
 {
  "file": "res-al-chipotle-con-pure-de-papa.jpg",
  "label": "Res al chipotle con pure de papa",
  "keys": [
   "res",
   "chipotle",
   "pure",
   "papa"
  ]
 },
 {
  "file": "res-al-chipotle-con-quinoa-y-espinaca.jpg",
  "label": "Res al chipotle con quinoa y espinaca",
  "keys": [
   "res",
   "chipotle",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "res-al-chipotle-con-quinoa.jpg",
  "label": "Res al chipotle con quinoa",
  "keys": [
   "res",
   "chipotle",
   "quinoa"
  ]
 },
 {
  "file": "res-al-horno-con-especias-con-camote-al-horno.jpg",
  "label": "Res al horno con especias con camote al horno",
  "keys": [
   "res",
   "horno",
   "especias",
   "camote"
  ]
 },
 {
  "file": "res-al-horno-con-especias-con-pure-de-papa.jpg",
  "label": "Res al horno con especias con pure de papa",
  "keys": [
   "res",
   "horno",
   "especias",
   "pure",
   "papa"
  ]
 },
 {
  "file": "res-al-horno-con-especias-con-quinoa-y-espinaca.jpg",
  "label": "Res al horno con especias con quinoa y espinaca",
  "keys": [
   "res",
   "horno",
   "especias",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "res-al-horno-con-especias-con-quinoa.jpg",
  "label": "Res al horno con especias con quinoa",
  "keys": [
   "res",
   "horno",
   "especias",
   "quinoa"
  ]
 },
 {
  "file": "res-al-pastor-con-calabacitas.jpg",
  "label": "Res al pastor con calabacitas",
  "keys": [
   "res",
   "pastor",
   "calabacitas"
  ]
 },
 {
  "file": "res-al-pastor-con-esparragos.jpg",
  "label": "Res al pastor con esparragos",
  "keys": [
   "res",
   "pastor",
   "esparragos"
  ]
 },
 {
  "file": "res-al-pastor-con-quinoa-y-espinaca.jpg",
  "label": "Res al pastor con quinoa y espinaca",
  "keys": [
   "res",
   "pastor",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "res-en-chile-pasilla.jpg",
  "label": "Res en chile pasilla",
  "keys": [
   "res",
   "chile",
   "pasilla"
  ]
 },
 {
  "file": "res-en-pipian-verde-con-arroz.jpg",
  "label": "Res en pipian verde con arroz",
  "keys": [
   "res",
   "pipian",
   "verde",
   "arroz"
  ]
 },
 {
  "file": "res-en-salsa-bbq-ligera-con-ensalada.jpg",
  "label": "Res en salsa bbq ligera con ensalada",
  "keys": [
   "res",
   "salsa",
   "bbq",
   "ligera",
   "ensalada"
  ]
 },
 {
  "file": "res-en-salsa-de-champinones-con-arroz.jpg",
  "label": "Res en salsa de champinones con arroz",
  "keys": [
   "res",
   "salsa",
   "champinones",
   "arroz"
  ]
 },
 {
  "file": "res-encebollado-con-calabacitas.jpg",
  "label": "Res encebollado con calabacitas",
  "keys": [
   "res",
   "encebollado",
   "calabacitas"
  ]
 },
 {
  "file": "rice-cake-con-pepino.jpg",
  "label": "Rice cake con pepino",
  "keys": [
   "rice",
   "cake",
   "pepino"
  ]
 },
 {
  "file": "rice-cakes.jpg",
  "label": "Rice cakes",
  "keys": [
   "rice",
   "cakes"
  ]
 },
 {
  "file": "rollitos-de-pavo.jpg",
  "label": "Rollitos de pavo",
  "keys": [
   "rollitos",
   "pavo"
  ]
 },
 {
  "file": "rollos-de-lechuga-con-pollo.jpg",
  "label": "Rollos de lechuga con pollo",
  "keys": [
   "rollos",
   "lechuga",
   "pollo"
  ]
 },
 {
  "file": "rollos-de-lechuga-con-tofu.jpg",
  "label": "Rollos de lechuga con tofu",
  "keys": [
   "rollos",
   "lechuga",
   "tofu"
  ]
 },
 {
  "file": "salmon-a-la-veracruzana-con-calabacitas.jpg",
  "label": "Salmon a la veracruzana con calabacitas",
  "keys": [
   "salmon",
   "veracruzana",
   "calabacitas"
  ]
 },
 {
  "file": "salmon-a-la-veracruzana-con-elote-y-calabaza.jpg",
  "label": "Salmon a la veracruzana con elote y calabaza",
  "keys": [
   "salmon",
   "veracruzana",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "salmon-a-la-veracruzana-con-esparragos.jpg",
  "label": "Salmon a la veracruzana con esparragos",
  "keys": [
   "salmon",
   "veracruzana",
   "esparragos"
  ]
 },
 {
  "file": "salmon-a-las-finas-hierbas-con-camote-al-horno.jpg",
  "label": "Salmon a las finas hierbas con camote al horno",
  "keys": [
   "salmon",
   "finas",
   "hierbas",
   "camote",
   "horno"
  ]
 },
 {
  "file": "salmon-a-las-finas-hierbas-con-pure-de-papa.jpg",
  "label": "Salmon a las finas hierbas con pure de papa",
  "keys": [
   "salmon",
   "finas",
   "hierbas",
   "pure",
   "papa"
  ]
 },
 {
  "file": "salmon-a-las-finas-hierbas-con-quinoa.jpg",
  "label": "Salmon a las finas hierbas con quinoa",
  "keys": [
   "salmon",
   "finas",
   "hierbas",
   "quinoa"
  ]
 },
 {
  "file": "salmon-al-chipotle-con-calabacitas.jpg",
  "label": "Salmon al chipotle con calabacitas",
  "keys": [
   "salmon",
   "chipotle",
   "calabacitas"
  ]
 },
 {
  "file": "salmon-al-chipotle-con-camote-al-horno.jpg",
  "label": "Salmon al chipotle con camote al horno",
  "keys": [
   "salmon",
   "chipotle",
   "camote",
   "horno"
  ]
 },
 {
  "file": "salmon-al-chipotle-con-esparragos.jpg",
  "label": "Salmon al chipotle con esparragos",
  "keys": [
   "salmon",
   "chipotle",
   "esparragos"
  ]
 },
 {
  "file": "salmon-al-chipotle-con-quinoa-y-espinaca.jpg",
  "label": "Salmon al chipotle con quinoa y espinaca",
  "keys": [
   "salmon",
   "chipotle",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "salmon-al-curry-con-elote-y-calabaza.jpg",
  "label": "Salmon al curry con elote y calabaza",
  "keys": [
   "salmon",
   "curry",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "salmon-al-curry-con-quinoa.jpg",
  "label": "Salmon al curry con quinoa",
  "keys": [
   "salmon",
   "curry",
   "quinoa"
  ]
 },
 {
  "file": "salmon-al-mojo-de-ajo-con-camote-al-horno.jpg",
  "label": "Salmon al mojo de ajo con camote al horno",
  "keys": [
   "salmon",
   "mojo",
   "ajo",
   "camote",
   "horno"
  ]
 },
 {
  "file": "salmon-al-mojo-de-ajo-con-pure-de-papa.jpg",
  "label": "Salmon al mojo de ajo con pure de papa",
  "keys": [
   "salmon",
   "mojo",
   "ajo",
   "pure",
   "papa"
  ]
 },
 {
  "file": "salmon-al-mojo-de-ajo-con-quinoa-y-espinaca.jpg",
  "label": "Salmon al mojo de ajo con quinoa y espinaca",
  "keys": [
   "salmon",
   "mojo",
   "ajo",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "salmon-al-mojo-de-ajo-con-quinoa.jpg",
  "label": "Salmon al mojo de ajo con quinoa",
  "keys": [
   "salmon",
   "mojo",
   "ajo",
   "quinoa"
  ]
 },
 {
  "file": "salmon-con-arroz.jpg",
  "label": "Salmon con arroz",
  "keys": [
   "salmon",
   "arroz"
  ]
 },
 {
  "file": "salmon-con-calabacitas-a-la-mexicana.jpg",
  "label": "Salmon con calabacitas a la mexicana",
  "keys": [
   "salmon",
   "calabacitas",
   "mexicana"
  ]
 },
 {
  "file": "salmon-con-pure-de-papa.jpg",
  "label": "Salmon con pure de papa",
  "keys": [
   "salmon",
   "pure",
   "papa"
  ]
 },
 {
  "file": "salmon-con-quinoa-y-espinaca.jpg",
  "label": "Salmon con quinoa y espinaca",
  "keys": [
   "salmon",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "salmon-empanizado-al-horno-con-calabacitas.jpg",
  "label": "Salmon empanizado al horno con calabacitas",
  "keys": [
   "salmon",
   "empanizado",
   "horno",
   "calabacitas"
  ]
 },
 {
  "file": "salmon-en-costra-de-ajonjoli-con-quinoa-y-espinaca.jpg",
  "label": "Salmon en costra de ajonjoli con quinoa y espinaca",
  "keys": [
   "salmon",
   "costra",
   "ajonjoli",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "salmon-teriyaki.jpg",
  "label": "Salmon teriyaki",
  "keys": [
   "salmon",
   "teriyaki"
  ]
 },
 {
  "file": "salmon-zarandeado-con-calabacitas.jpg",
  "label": "Salmon zarandeado con calabacitas",
  "keys": [
   "salmon",
   "zarandeado",
   "calabacitas"
  ]
 },
 {
  "file": "salmon-zarandeado-con-esparragos.jpg",
  "label": "Salmon zarandeado con esparragos",
  "keys": [
   "salmon",
   "zarandeado",
   "esparragos"
  ]
 },
 {
  "file": "salmon-zarandeado-con-quinoa-y-espinaca.jpg",
  "label": "Salmon zarandeado con quinoa y espinaca",
  "keys": [
   "salmon",
   "zarandeado",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "salteado-de-pollo.jpg",
  "label": "Salteado de pollo",
  "keys": [
   "salteado",
   "pollo"
  ]
 },
 {
  "file": "sandia-con-chile-y-limon.jpg",
  "label": "Sandia con chile y limon",
  "keys": [
   "sandia",
   "chile",
   "limon"
  ]
 },
 {
  "file": "sandwich-con-pan-thins.jpg",
  "label": "Sandwich con pan thins",
  "keys": [
   "sandwich",
   "pan",
   "thins"
  ]
 },
 {
  "file": "sandwich-de-atun.jpg",
  "label": "Sandwich de atun",
  "keys": [
   "sandwich",
   "atun"
  ]
 },
 {
  "file": "sandwich-de-pavo.jpg",
  "label": "Sandwich de pavo",
  "keys": [
   "sandwich",
   "pavo"
  ]
 },
 {
  "file": "sandwich-tuna-melt-1.jpg",
  "label": "Sandwich tuna melt 1",
  "keys": [
   "sandwich",
   "tuna",
   "melt",
   "1"
  ]
 },
 {
  "file": "sandwich-tuna-melt.jpg",
  "label": "Sandwich tuna melt",
  "keys": [
   "sandwich",
   "tuna",
   "melt"
  ]
 },
 {
  "file": "smoothie-de-fresa.jpg",
  "label": "Smoothie de fresa",
  "keys": [
   "smoothie",
   "fresa"
  ]
 },
 {
  "file": "smoothie-de-mango.jpg",
  "label": "Smoothie de mango",
  "keys": [
   "smoothie",
   "mango"
  ]
 },
 {
  "file": "smoothie-express-completo.jpg",
  "label": "Smoothie express completo",
  "keys": [
   "smoothie",
   "express",
   "completo"
  ]
 },
 {
  "file": "smoothie-reese-s.jpg",
  "label": "Smoothie reese s",
  "keys": [
   "smoothie",
   "reese",
   "s"
  ]
 },
 {
  "file": "sopa-azteca-tortilla.jpg",
  "label": "Sopa azteca tortilla",
  "keys": [
   "sopa",
   "azteca",
   "tortilla"
  ]
 },
 {
  "file": "sopa-de-fideo-con-pollo.jpg",
  "label": "Sopa de fideo con pollo",
  "keys": [
   "sopa",
   "fideo",
   "pollo"
  ]
 },
 {
  "file": "sopa-de-pollo-y-panela.jpg",
  "label": "Sopa de pollo y panela",
  "keys": [
   "sopa",
   "pollo",
   "panela"
  ]
 },
 {
  "file": "sopa-de-tortilla-con-pollo.jpg",
  "label": "Sopa de tortilla con pollo",
  "keys": [
   "sopa",
   "tortilla",
   "pollo"
  ]
 },
 {
  "file": "sopa-de-verduras.jpg",
  "label": "Sopa de verduras",
  "keys": [
   "sopa",
   "verduras"
  ]
 },
 {
  "file": "sope-con-frijol-y-bistec.jpg",
  "label": "Sope con frijol y bistec",
  "keys": [
   "sope",
   "frijol",
   "bistec"
  ]
 },
 {
  "file": "sope-con-pollo-o-huevo.jpg",
  "label": "Sope con pollo o huevo",
  "keys": [
   "sope",
   "pollo",
   "huevo"
  ]
 },
 {
  "file": "sope-de-pollo-o-huevo.jpg",
  "label": "Sope de pollo o huevo",
  "keys": [
   "sope",
   "pollo",
   "huevo"
  ]
 },
 {
  "file": "sopes-o-chalupas.jpg",
  "label": "Sopes o chalupas",
  "keys": [
   "sopes",
   "chalupas"
  ]
 },
 {
  "file": "tacos-de-bistec.jpg",
  "label": "Tacos de bistec",
  "keys": [
   "tacos",
   "bistec"
  ]
 },
 {
  "file": "tacos-de-lechuga-con-atun.jpg",
  "label": "Tacos de lechuga con atun",
  "keys": [
   "tacos",
   "lechuga",
   "atun"
  ]
 },
 {
  "file": "tacos-de-pollo.jpg",
  "label": "Tacos de pollo",
  "keys": [
   "tacos",
   "pollo"
  ]
 },
 {
  "file": "tacos-de-rajas.jpg",
  "label": "Tacos de rajas",
  "keys": [
   "tacos",
   "rajas"
  ]
 },
 {
  "file": "tinga-deshebrada.jpg",
  "label": "Tinga deshebrada",
  "keys": [
   "tinga",
   "deshebrada"
  ]
 },
 {
  "file": "tlacoyo-de-requeson-pavo.jpg",
  "label": "Tlacoyo de requeson pavo",
  "keys": [
   "tlacoyo",
   "requeson",
   "pavo"
  ]
 },
 {
  "file": "tlacoyos-con-nopal.jpg",
  "label": "Tlacoyos con nopal",
  "keys": [
   "tlacoyos",
   "nopal"
  ]
 },
 {
  "file": "toastadas-de-arroz-inflado.jpg",
  "label": "Toastadas de arroz inflado",
  "keys": [
   "toastadas",
   "arroz",
   "inflado"
  ]
 },
 {
  "file": "tofu-a-la-plancha-con-ensalada.jpg",
  "label": "Tofu a la plancha con ensalada",
  "keys": [
   "tofu",
   "plancha",
   "ensalada"
  ]
 },
 {
  "file": "tofu-agridulce-con-calabacitas.jpg",
  "label": "Tofu agridulce con calabacitas",
  "keys": [
   "tofu",
   "agridulce",
   "calabacitas"
  ]
 },
 {
  "file": "tofu-agridulce-con-camote-al-horno.jpg",
  "label": "Tofu agridulce con camote al horno",
  "keys": [
   "tofu",
   "agridulce",
   "camote",
   "horno"
  ]
 },
 {
  "file": "tofu-agridulce-con-esparragos.jpg",
  "label": "Tofu agridulce con esparragos",
  "keys": [
   "tofu",
   "agridulce",
   "esparragos"
  ]
 },
 {
  "file": "tofu-agridulce-con-pure-de-papa.jpg",
  "label": "Tofu agridulce con pure de papa",
  "keys": [
   "tofu",
   "agridulce",
   "pure",
   "papa"
  ]
 },
 {
  "file": "tofu-agridulce-con-quinoa-y-espinaca.jpg",
  "label": "Tofu agridulce con quinoa y espinaca",
  "keys": [
   "tofu",
   "agridulce",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "tofu-al-ajillo-con-elote-y-calabaza.jpg",
  "label": "Tofu al ajillo con elote y calabaza",
  "keys": [
   "tofu",
   "ajillo",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "tofu-al-ajillo-con-ensalada.jpg",
  "label": "Tofu al ajillo con ensalada",
  "keys": [
   "tofu",
   "ajillo",
   "ensalada"
  ]
 },
 {
  "file": "tofu-al-curry-con-camote-al-horno.jpg",
  "label": "Tofu al curry con camote al horno",
  "keys": [
   "tofu",
   "curry",
   "camote",
   "horno"
  ]
 },
 {
  "file": "tofu-al-curry-con-pure-de-papa.jpg",
  "label": "Tofu al curry con pure de papa",
  "keys": [
   "tofu",
   "curry",
   "pure",
   "papa"
  ]
 },
 {
  "file": "tofu-al-curry-con-quinoa-y-espinaca.jpg",
  "label": "Tofu al curry con quinoa y espinaca",
  "keys": [
   "tofu",
   "curry",
   "quinoa",
   "espinaca"
  ]
 },
 {
  "file": "tofu-al-curry-con-quinoa.jpg",
  "label": "Tofu al curry con quinoa",
  "keys": [
   "tofu",
   "curry",
   "quinoa"
  ]
 },
 {
  "file": "tofu-en-salsa-de-champinones-con-ensalada.jpg",
  "label": "Tofu en salsa de champinones con ensalada",
  "keys": [
   "tofu",
   "salsa",
   "champinones",
   "ensalada"
  ]
 },
 {
  "file": "tofu-en-salsa-de-champinones-con-quinoa.jpg",
  "label": "Tofu en salsa de champinones con quinoa",
  "keys": [
   "tofu",
   "salsa",
   "champinones",
   "quinoa"
  ]
 },
 {
  "file": "tofu-teriyaki-con-calabacitas.jpg",
  "label": "Tofu teriyaki con calabacitas",
  "keys": [
   "tofu",
   "teriyaki",
   "calabacitas"
  ]
 },
 {
  "file": "tofu-teriyaki-con-elote-y-calabaza.jpg",
  "label": "Tofu teriyaki con elote y calabaza",
  "keys": [
   "tofu",
   "teriyaki",
   "elote",
   "calabaza"
  ]
 },
 {
  "file": "tofu-teriyaki-con-esparragos.jpg",
  "label": "Tofu teriyaki con esparragos",
  "keys": [
   "tofu",
   "teriyaki",
   "esparragos"
  ]
 },
 {
  "file": "toronja-natural.jpg",
  "label": "Toronja natural",
  "keys": [
   "toronja",
   "natural"
  ]
 },
 {
  "file": "tortilla-espanola.jpg",
  "label": "Tortilla espanola",
  "keys": [
   "tortilla",
   "espanola"
  ]
 },
 {
  "file": "tostada-de-atun.jpg",
  "label": "Tostada de atun",
  "keys": [
   "tostada",
   "atun"
  ]
 },
 {
  "file": "tostada-francesa-de-avena.jpg",
  "label": "Tostada francesa de avena",
  "keys": [
   "tostada",
   "francesa",
   "avena"
  ]
 },
 {
  "file": "tostadas-de-pavo-con-aguacate.jpg",
  "label": "Tostadas de pavo con aguacate",
  "keys": [
   "tostadas",
   "pavo",
   "aguacate"
  ]
 },
 {
  "file": "tostadas-de-pavo-con-salmas.jpg",
  "label": "Tostadas de pavo con salmas",
  "keys": [
   "tostadas",
   "pavo",
   "salmas"
  ]
 },
 {
  "file": "tostaditas-de-pollo-o-atun.jpg",
  "label": "Tostaditas de pollo o atun",
  "keys": [
   "tostaditas",
   "pollo",
   "atun"
  ]
 },
 {
  "file": "tuna-natural.jpg",
  "label": "Tuna natural",
  "keys": [
   "tuna",
   "natural"
  ]
 },
 {
  "file": "uvas-congeladas-con-yogurt.jpg",
  "label": "Uvas congeladas con yogurt",
  "keys": [
   "uvas",
   "congeladas",
   "yogurt"
  ]
 },
 {
  "file": "verduras-rostizadas-con-pollo.jpg",
  "label": "Verduras rostizadas con pollo",
  "keys": [
   "verduras",
   "rostizadas",
   "pollo"
  ]
 },
 {
  "file": "volcanes-de-carne-o-pllo.jpg",
  "label": "Volcanes de carne o pllo",
  "keys": [
   "volcanes",
   "carne",
   "pllo"
  ]
 },
 {
  "file": "volcanes-de-pollo-y-queso.jpg",
  "label": "Volcanes de pollo y queso",
  "keys": [
   "volcanes",
   "pollo",
   "queso"
  ]
 },
 {
  "file": "wrap-de-pollo.jpg",
  "label": "Wrap de pollo",
  "keys": [
   "wrap",
   "pollo"
  ]
 },
 {
  "file": "zanahoria-y-apio-con-hummus.jpg",
  "label": "Zanahoria y apio con hummus",
  "keys": [
   "zanahoria",
   "apio",
   "hummus"
  ]
 },
 {
  "file": "zanahorias-baby-con-guacamole.jpg",
  "label": "Zanahorias baby con guacamole",
  "keys": [
   "zanahorias",
   "baby",
   "guacamole"
  ]
 }
];

export default BANCO_FOTOS;
