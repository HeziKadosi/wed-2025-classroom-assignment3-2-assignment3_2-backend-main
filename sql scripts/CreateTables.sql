
USE `Schema1`;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  firstname VARCHAR(50) NOT NULL,
  lastname VARCHAR(50) NOT NULL,
  country VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  profilePic VARCHAR(255)
);

-- Personal recipes table
CREATE TABLE recipes (
  recipe_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  photo VARCHAR(255),
  preparation_time INT,
  groceries_list TEXT,
  preparation_instructions TEXT,
  creator_id INT,
  likes INT DEFAULT 0,
  viewed BOOLEAN DEFAULT FALSE,
  isVegan BOOLEAN DEFAULT FALSE,
  isVegetarian BOOLEAN DEFAULT FALSE,
  isGlutenFree BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (creator_id) REFERENCES users(user_id)
);

-- Favorites table (many-to-many)
CREATE TABLE user_favorites (
  user_id INT,
  recipe_id INT,
  PRIMARY KEY (user_id, recipe_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id)
);

-- Search history table
CREATE TABLE user_searches (
  user_id INT,
  search_term VARCHAR(255),
  search_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Family recipes table
CREATE TABLE family_recipes (
  recipe_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255),
  photo VARCHAR(255),
  preparation_time INT,
  groceries_list TEXT,
  preparation_instructions TEXT,
  family_member VARCHAR(255),
  occasion VARCHAR(255)
);

-- Link between users and family recipes
CREATE TABLE user_family_recipes (
  user_id INT,
  recipe_id INT,
  PRIMARY KEY (user_id, recipe_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (recipe_id) REFERENCES family_recipes(recipe_id)
);
