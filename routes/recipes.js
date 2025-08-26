var express = require("express");
var router = express.Router();
const recipes_utils = require("./utils/recipes_utils");
const DButils = require("./utils/DButils");


router.get("/", (req, res) => res.send("im here"));

/**
 * This path returns 3 random recipes for not logged-in users
 */
router.get("/random", async (req, res, next) => {
  console.log("Random recipes requested");
  try {
    // if (req.session?.user_id) {
    //   return res.status(401).send("User logged in");
    // }
    const recipes = await recipes_utils.getRandomRecipes(req.session?.user_id);
    res.status(200).send(recipes);
  } catch (error) {
    next(error);
  }
});

/**
 * This path searches for recipes by title
 */
router.get("/search", async (req, res, next) => {
  try {
    const query = req.query.query;
    const number = parseInt(req.query.number) || 5;
    const user_id = req.session?.user_id;


    // check if the search term already exists in the user's search history
    const existingSearches = await DButils.execQuery(`
      SELECT * FROM user_searches WHERE user_id = '${user_id}' AND search_term = '${query}'
    `);
    
    if (user_id && existingSearches.length === 0) {
      await DButils.execQuery(`
        INSERT INTO user_searches (user_id, search_term)
        VALUES ('${user_id}', '${query}')
      `);
    }

    const filters = {};
    if (req.query.cuisine) filters.cuisine = req.query.cuisine;
    if (req.query.diet) filters.diet = req.query.diet;
    if (req.query.intolerances) filters.intolerances = req.query.intolerances; // comma-separated

    const results = await recipes_utils.searchRecipes(query, number, filters, user_id);
    res.status(200).send(results);
  } catch (error) {
    next(error);
  }
});

router.get("/show-recipe/:recipeId", async (req, res, next) => {
  try {
    const recipe = await recipes_utils.getRecipeDetails(req.params.recipeId, req.session?.user_id);
    res.send(recipe);
    if (req.session && req.session.user_id) {
      const user_id = req.session.user_id;
      const recipe_id = req.params.recipeId;
      await recipes_utils.markAsWatched(user_id, recipe_id);
    }
  } catch (error) {
    next(error);
  }
});


/**
 * This path returns a full details of a recipe by its id
 */
router.get("/:recipeId", async (req, res, next) => {
  try {
    const recipe = await recipes_utils.getRecipeDetails(req.params.recipeId, req.session?.user_id);
    res.send({recipe});
    console.log("Recipe details:", recipe);
  } catch (error) {
    next(error);
  }
});


/**
 * This path gets body with recipeId and deletes this recipe
 */
router.delete("/:recipeId", async (req, res, next) => {
  try {
    if (!req.session || !req.session.user_id) {
      return res.status(401).send("User not logged in");
    }
    // Check if the recipe exists
    const recipe = await recipes_utils.getRecipeDetails(req.params.recipeId, req.session.user_id);
    if (!recipe) {
      return res.status(404).send("Recipe not found");
    }
    // Check if the user is the creator of the recipe
    if (recipe.creator_username !== req.session.username) {
      return res.status(403).send("You are not authorized to delete this recipe");
    }
    const recipe_id = req.params.recipeId;
    await recipes_utils.deleteRecipe(recipe_id);
    res.status(200).send("The Recipe successfully deleted");
  } catch (error) {
    next(error);
  }
});

/**
 * This path gets userID and recipeID and adds a like to the recipe
*/
router.post("/like/:recipeId", async (req, res, next) => {
  try {
    if (!req.session || !req.session.user_id) {
      return res.status(401).send("User not logged in");
    }
    console.log('id', req.session.user_id);
    // Check if the user has already liked the recipe
    const user_id = req.session.user_id;
    const likedRecipes = await recipes_utils.getLikedRecipes(user_id);
    if (likedRecipes.find((x) => x.recipe_id === req.params.recipeId)) {
      return res.status(409).send("You have already liked this recipe");
    }
    const recipe_id = req.params.recipeId;
    await recipes_utils.addLike(user_id, recipe_id);
    res.status(200).send("The Recipe successfully liked");
  } catch (error) {
    next(error);
  }
});

/**
 * This path gets userID and recipeID and removes a like from the recipe
 */
router.delete("/like/:recipeId", async (req, res, next) => {
  try {
    if (!req.session || !req.session.user_id) {
      return res.status(401).send("User not logged in");
    }
    // Check if the user has already liked the recipe
    const user_id = req.session.user_id;
    const likedRecipes = await recipes_utils.getLikedRecipes(user_id);
    if (!likedRecipes.includes(parseInt(req.params.recipeId))) {
      return res.status(409).send("You have not liked this recipe yet");
    }
    const recipe_id = req.params.recipeId;
    await recipes_utils.removeLike(user_id, recipe_id);
    res.status(200).send("The Recipe successfully unliked");
  } catch (error) {
    next(error);
  }
});


/**
 * This path gets title, photo, preparation time, groceries list, and preparation instructions creates a new recipe
 */
router.post("/", async (req, res, next) => {
  try {
    if (!req.session || !req.session.user_id) {
      return res.status(401).send("User not logged in");
    }
    // Check if the required fields are present
    const requiredFields = [
      "title",
      "photo",
      "preparation_time",
      "groceries_list",
      "preparation_instructions"
    ];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).send(`Missing field: ${field}`);
      }
    }
    const recipe = {
      title: req.body.title,
      photo: req.body.photo,
      preparation_time: req.body.preparation_time,
      groceries_list: req.body.groceries_list,
      preparation_instructions: req.body.preparation_instructions,
      creator_username: req.session.username,
      likes: 0,
      viewed: false,
      isFavorite: false,
      isVegan: req.body.isVegan || false,
      isVegetarian: req.body.isVegetarian || false,
      isGlutenFree: req.body.isGlutenFree || false
    };

    await recipes_utils.createRecipe(recipe);
    res.status(201).send("The Recipe successfully created");
  } catch (error) {
    next(error);
  }
});



module.exports = router;
