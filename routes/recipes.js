var express = require("express");
var router = express.Router();
const recipes_utils = require("./utils/recipes_utils");
const e = require("express");

router.get("/", (req, res) => res.send("im here"));


/**
 * This path returns a full details of a recipe by its id
 */
router.get("/:recipeId", async (req, res, next) => {
  try {
    const recipe = await recipes_utils.getRecipeDetails(req.params.recipeId);
    res.send(recipe);
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


/**
 * This path gets body with recipeId and deletes this recipe
 */
router.delete("/:recipeId", async (req, res, next) => {
  try {
    if (!req.session || !req.session.user_id) {
      return res.status(401).send("User not logged in");
    }
    // Check if the recipe exists
    const recipe = await recipes_utils.getRecipeDetails(req.params.recipeId);
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
    // Check if the user has already liked the recipe
    const user_id = req.session.user_id;
    const likedRecipes = await recipes_utils.getLikedRecipes(user_id);
    if (likedRecipes.find((x) => x.recipe_id === req.params.recipeId)) {
      return res.status(409).send("You have already liked this recipe");
    }
    const recipe_id = req.params.recipeId;
    await recipes_utils.addLike(recipe_id, user_id);
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
    if (!likedRecipes.find((x) => x.recipe_id === req.params.recipeId)) {
      return res.status(409).send("You have not liked this recipe yet");
    }
    const recipe_id = req.params.recipeId;
    await recipes_utils.removeLike(recipe_id, user_id);
    res.status(200).send("The Recipe successfully unliked");
  } catch (error) {
    next(error);
  }
});

/**
 * This path returns 3 random recipes for not logged-in users
 */
router.get("/random", async (req, res, next) => {
  try {
    // Check if the user is logged in
    if (req.session || req.session.user_id) {
      return res.status(401).send("User logged in");
    }
    const recipes = await recipes_utils.getRandomRecipes();
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

    if (!query) {
      return res.status(400).send("Missing search query");
    }
    if (user_id) {
      await DButils.execQuery(`
        INSERT INTO user_searches (user_id, search_term)
        VALUES ('${user_id}', '${query}')
      `);
    }
    const response = await axios.get(`https://api.spoonacular.com/recipes/complexSearch`, {
      params: {
        query: query,
        number: number,
        apiKey: process.env.SPOONACULAR_API_KEY,
      },
    });
    res.status(200).send(response.data.results);
  } catch (error) {
    next(error);
  }
});





module.exports = router;
