const axios = require("axios");
const e = require("express");
const api_domain = "https://api.spoonacular.com/recipes";
const DButils = require("./DButils");


/**
 * Get recipes list from spooncular response and extract the relevant recipe data for preview
 * @param {*} recipes_info 
 */


async function getRecipeInformation(recipe_id) {
    return await axios.get(`${api_domain}/${recipe_id}/information`, {
        params: {
            includeNutrition: false,
            apiKey: process.env.spooncular_apiKey
        }
    });
}

async function getRecipeDetails(recipe_id) {
    let recipe_info = await getRecipeInformation(recipe_id);
    let { id, title, readyInMinutes, image, aggregateLikes, vegan, vegetarian, glutenFree } = recipe_info.data;

    return {
        id: id,
        title: title,
        readyInMinutes: readyInMinutes,
        image: image,
        popularity: aggregateLikes,
        vegan: vegan,
        vegetarian: vegetarian,
        glutenFree: glutenFree,
        
    }
}


async function getRandomRecipes() {
  try {
    const response = await axios.get("https://api.spoonacular.com/recipes/random", {
      params: {
        number: 3,
        includeNutrition: false,
        apiKey: process.env.spooncular_apiKey,
      },
    });

    const recipes = response.data.recipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      image: recipe.image,
      readyInMinutes: recipe.readyInMinutes,
      popularity: recipe.aggregateLikes,
      vegetarian: recipe.vegetarian,
      vegan: recipe.vegan,
      glutenFree: recipe.glutenFree,
    }));

    return recipes;
  } catch (error) {
    console.error("Error fetching recipes:", error.response?.data || error.message);
    throw error;
  }
}

async function getLikedRecipes(user_id) {
    const liked_recipes = await DButils.execQuery(`SELECT recipe_id FROM user_liked_recipes WHERE user_id = ${user_id}`);
    return liked_recipes.map((recipe) => recipe.recipe_id);
}

async function addLike(user_id, recipe_id) {
  const result = await DButils.execQuery(
    `SELECT * FROM user_liked_recipes WHERE user_id = ${user_id} AND recipe_id = ${recipe_id}`
  );

  if (result.length === 0) {
    await DButils.execQuery(
      `INSERT INTO user_liked_recipes (user_id, recipe_id) VALUES (${user_id}, ${recipe_id})`
    );
  }
    else {
        throw { status: 409, message: "You have already liked this recipe"};
    }
}



async function removeLike(user_id, recipe_id) {
    await DButils.execQuery(`DELETE FROM user_liked_recipes WHERE user_id = ${user_id} AND recipe_id = ${recipe_id};`);
}

async function searchRecipes(query, number = 5, filters = {}) {
  const params = {
    query,
    number,
    apiKey: process.env.spooncular_apiKey,
    ...filters,
  };

  try {
    const response = await axios.get(`${api_domain}/complexSearch`, { params });
    return response.data.results;
  } catch (error) {
    console.error("searchRecipes error:", error.response?.data || error.message);
    throw { status: 500, message: error.response?.data?.message || "Search failed" };
  }
}






exports.searchRecipes = searchRecipes;
exports.getLikedRecipes = getLikedRecipes;
exports.addLike = addLike;
exports.removeLike = removeLike;
exports.getRecipeDetails = getRecipeDetails;
exports.getRandomRecipes = getRandomRecipes;



