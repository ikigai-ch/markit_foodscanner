-- Up

CREATE TABLE User (
  id INTEGER PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name VARCHAR(255),
  barcode VARCHAR(255),
  product_name VARCHAR(255),
  image_url VARCHAR(255),
  eco_score VARCHAR(10),
  expiration_date DATE,
  co2 REAL,
  has_palm_oil INTEGER,
  is_vegan INTEGER,
  quantity INTEGER
);

-- Down

DROP TABLE User;
DROP TABLE Products;
