<?php

/*
|--------------------------------------------------------------------------
| Smart product import dictionary
|--------------------------------------------------------------------------
|
| Starter words the Excel importer uses to understand messy product names.
| Everything already saved in the system (brands, categories, variant options,
| units of measure, existing product names) is loaded from the database on top
| of these lists, so the importer gets smarter as the catalog grows. Edit these
| lists to teach it new words; no code change is needed.
|
| All matching is case-insensitive and on whole words.
|
*/

return [

    /*
     | Cloudinary folder for pictures taken from the Excel file (same folder as product
     | images uploaded from the product form).
     */
    'image_folder' => env('CLOUDINARY_FOLDER', 'products'),

    /*
     | Excel header names recognised for each system field. The first header row
     | that matches at least two fields is used. Two-row headers ("STOCK" over
     | "BALANCE") are joined automatically.
     */
    'headers' => [
        'part_no'      => ['PART NO', 'PART NUMBER', 'PART #', 'PARTNO', 'PART NUM', 'P/N', 'PN', 'ITEM CODE', 'CODE', 'SKU'],
        'name'         => ['DESCRIPTION', 'PART NAME', 'PRODUCT NAME', 'ITEM NAME', 'ITEM DESCRIPTION', 'PARTICULARS', 'PRODUCT', 'ITEM', 'NAME'],
        'chinese_name' => ['CHINESE NAME', 'CHINESE', '中文名', '中文名称', '中文'],
        'image'        => ['IMAGE', 'PICTURE', 'PHOTO', 'IMG'],
        'address'      => ['ADDRESS', 'LOCATION', 'LOC', 'SHELF', 'RACK', 'BIN'],
        'stock'        => ['STOCK BALANCE', 'STOCK ON HAND', 'QTY ON HAND', 'ON HAND', 'BALANCE', 'STOCK', 'INVENTORY'],
        'price1'       => ['PRICE 1', 'PRICE1', 'ORIGINAL PRICE', 'ORIG PRICE'],
        'price2'       => ['PRICE 2', 'PRICE2', 'RETAIL PRICE', 'SRP', 'SELLING PRICE'],
        'price'        => ['PRICE', 'UNIT PRICE'],
        'brand'        => ['BRAND', 'MAKE'],
        'category'     => ['CATEGORY', 'GROUP'],
        'uom'          => ['UOM', 'UNIT', 'UNIT OF MEASURE'],
        'notes'        => ['NOTES', 'NOTE', 'REMARKS', 'REMARK'],
    ],

    /*
     | Headers that mark a sheet as a sales log (daily sales). On such sheets the
     | QTY column is a quantity sold, never stock, so stock starts at 0.
     */
    'sales_log_headers' => ['DATE', 'CUSTOMER NAME', 'CUSTOMER', 'SALES', 'SERVE BY', 'PAYMENT'],

    /*
     | Brand names to recognise even before they exist in Settings -> Brands.
     */
    'brands' => [
        'HOWO', 'SINOTRUK', 'WEICHAI', 'SHACMAN', 'FAW', 'FOTON', 'DONGFENG', 'JAC', 'CAMC', 'BEIBEN',
        'YUCHAI', 'CUMMINS', 'ISUZU', 'HINO', 'MITSUBISHI', 'FUSO', 'NISSAN', 'TOYOTA', 'VOLVO', 'SCANIA',
        'MERCEDES', 'BENZ', 'MAN', 'DAF', 'IVECO', 'KOMATSU', 'CATERPILLAR', 'HITACHI', 'KOBELCO', 'SANY',
        'XCMG', 'LIUGONG', 'SDLG', 'SHANTUI', 'ZOOMLION', 'DOOSAN', 'HYUNDAI', 'KUBOTA', 'YANMAR', 'PERKINS',
        'DEUTZ', 'BOSCH', 'DENSO', 'FLEETGUARD', 'DONALDSON', 'MANN', 'SAKURA', 'VIC', 'NGK', 'KOYO', 'NSK',
        'SKF', 'NTN', 'TIMKEN', 'FAG', 'GATES', 'BANDO', 'SHELL', 'CALTEX', 'PETRON', 'CASTROL', 'MOBIL',
        'TOTAL', 'BMF', 'SONGTENG', 'WABCO', 'KNORR', 'HELLA', 'NARVA', 'OSRAM', 'PHILIPS',
    ],

    /*
     | Brand words that are also common part words. They count as a brand only
     | when they appear in [brackets] or after a dash, e.g. "OIL - TOTAL".
     */
    'ambiguous_brands' => ['MAN', 'TOTAL', 'MOBIL', 'VIC'],

    /*
     | Variant words per variant type (type name must match Settings -> Products
     | Settings). Existing options of every type are added from the database.
     */
    'variant_words' => [
        'Specification' => [
            'LEFT', 'RIGHT', 'TOP', 'BOTTOM', 'FRONT', 'REAR', 'UPPER', 'LOWER', 'INNER', 'OUTER',
            'LH', 'RH', 'STRAIGHT', 'ELBOW', 'TEE', 'CROSS', 'REDUCER', 'MALE', 'FEMALE', 'HIGH PRESSURE', 'LOW PRESSURE',
            'HEAVY DUTY', 'STANDARD TYPE', 'WITH SENSOR', 'NO SENSOR', 'WITHOUT SENSOR',
        ],
        'Quality' => [
            'EXPENSIVE', 'CHEAP', 'ORIGINAL', 'GENUINE', 'OEM', 'SURPLUS', 'IMITATION',
            'CLASS A', 'CLASS B', 'CLASS C', 'HIGH QUALITY', 'ECONOMY',
        ],
        'Color' => [
            'WHITE', 'BLACK', 'RED', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'AMBER', 'SILVER',
            'GRAY', 'GREY', 'BROWN', 'PINK', 'VIOLET', 'PURPLE', 'GOLD', 'CHROME', 'SMOKE',
        ],
        'Size' => ['BIG', 'SMALL', 'MEDIUM', 'LARGE', 'MINI', 'JUMBO', 'XL', 'XXL'],
    ],

    /*
     | Category guesses when no existing category fits. Key = category name to
     | create (or reuse when a category with that name already exists),
     | value = words that point to it (singular; plurals are matched too).
     */
    'categories' => [
        'Hoses & Tubes'         => ['HOSE', 'TUBE', 'PIPE'],
        'Connectors & Fittings' => ['CONNECTOR', 'FITTING', 'COUPLING', 'COUPLER', 'ADAPTER', 'NIPPLE', 'UNION', 'JOINT', 'CLAMP'],
        'Lights'                => ['LIGHT', 'LAMP', 'BULB', 'HEADLIGHT', 'HEADLAMP', 'BLINKER', 'LED', 'BEACON'],
        'Filters'               => ['FILTER', 'SEPARATOR', 'STRAINER', 'ELEMENT'],
        'Oils & Lubricants'     => ['OIL', 'GREASE', 'LUBRICANT', 'FLUID', 'COOLANT', 'ATF'],
        'Electrical'            => ['SWITCH', 'WIRE', 'RELAY', 'SENSOR', 'ALARM', 'HORN', 'FUSE', 'BATTERY', 'ALTERNATOR', 'STARTER', 'SOCKET', 'CABLE', 'SOLENOID'],
        'Brakes'                => ['BRAKE', 'LINING', 'CALIPER', 'DRUM', 'DRYER'],
        'Seals & Bearings'      => ['SEAL', 'BEARING', 'GASKET', 'O-RING', 'ORING', 'BUSHING'],
        'Bolts & Fasteners'     => ['BOLT', 'NUT', 'SCREW', 'STUD', 'WASHER', 'RIVET'],
        'Engine Parts'          => ['PISTON', 'LINER', 'INJECTOR', 'NOZZLE', 'TURBO', 'TURBOCHARGER', 'CRANKSHAFT', 'CAMSHAFT', 'VALVE', 'PUMP', 'GASKET', 'THERMOSTAT', 'BELT', 'RADIATOR'],
        'Driveline'             => ['SHAFT', 'PROPELLER', 'AXLE', 'DIFFERENTIAL', 'GEAR', 'CLUTCH', 'PLANETARY'],
        'Body & Cab Parts'      => ['MIRROR', 'WIPER', 'BUMPER', 'DOOR', 'HANDLE', 'GLASS', 'CAP', 'COVER', 'SEAT', 'FENDER', 'CABIN', 'MUDGUARD', 'GRILLE'],
        'Suspension & Steering' => ['SPRING', 'SHOCK', 'ABSORBER', 'STEERING', 'HUB', 'KING', 'STABILIZER', 'SUSPENSION', 'MOUNT', 'BUSH', 'TIE', 'ROD', 'BALL'],
        'Hydraulics'            => ['HYDRAULIC', 'CYLINDER'],
    ],

    /*
     | Words ignored when matching a name to a category (too generic to decide).
     */
    'category_stopwords' => [
        'AND', 'THE', 'FOR', 'WITH', 'PART', 'PARTS', 'GENERAL', 'HEAVY', 'MISC', 'OTHER', 'OTHERS',
        'TYPE', 'NEW', 'SET', 'ASSY', 'ASSEMBLY', 'KIT',
    ],

    /*
     | Category used when nothing matches.
     */
    'fallback_category' => 'Uncategorized',

    /*
     | Unit words found in stock cells ("2 ROLLS") mapped to a unit of measure.
     | Units not listed here and not in Settings are added to Settings.
     */
    'units' => [
        'PC' => 'Piece / PCS', 'PCS' => 'Piece / PCS', 'PIECE' => 'Piece / PCS', 'EA' => 'Piece / PCS',
        'ROLL' => 'Roll', 'SET' => 'Set', 'BOX' => 'Box', 'PACK' => 'Pack', 'PAIR' => 'Pair', 'PR' => 'Pair',
        'UNIT' => 'Unit', 'METER' => 'Meter / m', 'MTR' => 'Meter / m', 'M' => 'Meter / m',
        'KG' => 'Kilogram / kg', 'KILO' => 'Kilogram / kg', 'L' => 'Liter / L', 'LTR' => 'Liter / L',
        'LITER' => 'Liter / L', 'LITRE' => 'Liter / L',
    ],
];
