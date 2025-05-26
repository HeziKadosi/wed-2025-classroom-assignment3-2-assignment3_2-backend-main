const e = require("express");
const DButils = require("./DButils");

async function markAsFavorite(user_id, recipe_id){
    await DButils.execQuery(`insert into user_favorites values ('${user_id}',${recipe_id})`);
}

async function getFavoriteRecipes(user_id){
    const recipes_id = await DButils.execQuery(`select recipe_id from user_favorites where user_id='${user_id}'`);
    return recipes_id;
}

async function getMyRecipes(user_id) {
  const recipes = await DButils.execQuery(`SELECT * FROM recipes WHERE creator_id = ${user_id}`);
  return recipes;
}

async function getUserDetails(user_id) {
    const user_details = await DButils.execQuery(`SELECT * FROM users WHERE user_id = ${user_id}`);
    delete user_details[0].password; // Remove password from the details
    return user_details[0];
    }

async function markAsWatched(user_id, recipe_id) {
    await DButils.execQuery(`
  INSERT INTO user_recipe_views (user_id, recipe_id, viewed_at)
  VALUES (${user_id}, ${recipe_id}, CURRENT_TIMESTAMP)
  ON DUPLICATE KEY UPDATE viewed_at = CURRENT_TIMESTAMP;`);
}


exports.markAsFavorite = markAsFavorite;
exports.getFavoriteRecipes = getFavoriteRecipes;
exports.getMyRecipes = getMyRecipes;
exports.getUserDetails = getUserDetails;
exports.markAsWatched = markAsWatched;