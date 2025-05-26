var express = require("express");
var router = express.Router();
const DButils = require("./utils/DButils");
const user_utils = require("./utils/user_utils");
const recipe_utils = require("./utils/recipes_utils");

/**
 * Authenticate all incoming requests by middleware
 */
router.use(async function (req, res, next) {
  if (req.session && req.session.user_id) {
    DButils.execQuery("SELECT user_id FROM users").then((users) => {
      if (users.find((x) => x.user_id === req.session.user_id)) {
        req.user_id = req.session.user_id;
        next();
      }
    }).catch(err => next(err));
  } else {
    res.sendStatus(401);
  }
});


/**
 * This path gets body with recipeId and save this recipe in the favorites list of the logged-in user
 */
router.post("/favorites", async (req, res, next) => {
  try {
    if (!req.session || !req.session.user_id)
      return res.status(401).send("User not logged in");
    const user_id = req.session.user_id;
    const recipe_id = req.body.recipeId;
    const exists = await DButils.execQuery(`
      SELECT * FROM user_favorites WHERE user_id = ${user_id} AND recipe_id = ${recipe_id}
    `);
    if (exists.length > 0) {
      return res.status(409).send("Recipe already in favorites");
    }
    const recipeExists = await DButils.execQuery(`SELECT * FROM recipes WHERE recipe_id = ${recipe_id}`);
    if (recipeExists.length === 0) {
      const spoonData = await recipe_utils.getRecipeDetails(recipe_id);
      const { title, image, readyInMinutes } = spoonData;
      await DButils.execQuery(`INSERT INTO recipes (recipe_id, title, photo, preparation_time, groceries_list, preparation_instructions, creator_id)
      VALUES (${recipe_id}, '${title}', '${image}', ${readyInMinutes}, 'N/A', 'N/A', NULL)`);
    }
    await DButils.execQuery(`
      INSERT INTO user_favorites (user_id, recipe_id)
      VALUES (${user_id}, ${recipe_id})
    `);
    res.status(200).send("Recipe added to favorites");
  } catch (err) {
    next(err);
  }
});


/**
 * This path returns the favorites recipes that were saved by the logged-in user
 */
router.get('/favorites', async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    const recipes_id = await user_utils.getFavoriteRecipes(user_id);
    const recipes_id_array = recipes_id.map((element) => element.recipe_id); // extract IDs
    const favorite_recipes = await Promise.all(
      recipes_id_array.map((id) => recipe_utils.getRecipeDetails(id))
    );
    res.status(200).send(favorite_recipes);
  } catch (error) {
    next(error);
  }
});


/**
 * This path gets body with recipeId and delete this recipe from the favorites list of the logged-in user
 */
router.delete("/favorites/:recipeId", async (req, res, next) => {
  try {
    if (!req.session || !req.session.user_id)
      return res.status(401).send("User not logged in");
    const user_id = req.session.user_id;
    const recipe_id = req.params.recipeId;
    const exists = await DButils.execQuery(`SELECT * FROM user_favorites WHERE user_id = ${user_id} AND recipe_id = ${recipe_id}`);
    if (exists.length === 0) {
      return res.status(404).send("Recipe not found in favorites");
    }
    await DButils.execQuery(`DELETE FROM user_favorites WHERE user_id = ${user_id} AND recipe_id = ${recipe_id}`);
    res.status(200).send("Recipe removed from favorites");
  } catch (err) {
    next(err);
  }
});


/**
 * This path returns the logged-in user details
 */
router.get('/user-details', async (req,res,next) => {
  try{
    if (!req.session || !req.session.user_id)
      return res.status(401).send("User not logged in");
    const user_id = req.session.user_id;
    const user_details = await user_utils.getUserDetails(user_id);
    res.status(200).send(user_details);
  } catch(error){
    next(error);
  }
});

/**
 * This path returns the family recipes that were saved by the logged-in user
 */
router.get('/family', async (req,res,next) => {
  try{
    const user_id = req.session.user_id;
    let family_recipes = {};
    const recipes_id = await user_utils.getFamilyRecipes(user_id);
    let recipes_id_array = [];
    recipes_id.map((element) => recipes_id_array.push(element.recipe_id)); //extracting the recipe ids into array
    const results = await recipe_utils.getRecipesPreview(recipes_id_array);
    res.status(200).send(results);
  } catch(error){
    next(error); 
  }
});

/**
 * This path gets body with recipeId and save this recipe in the family list of the logged-in user
 */
router.post('/family', async (req,res,next) => {
  try{
    // Check if the recipeId is in the family list
    const recipe_id = req.body.recipeId;
    if (recipe_id in user_utils.getFamilyRecipes(req.session.user_id)){
      return res.status(410).send("You have saved this recipe as family already");
    }
    const user_id = req.session.user_id;
    await user_utils.markAsFamily(user_id,recipe_id);
    res.status(200).send("The Recipe successfully saved as family");
    } catch(error){
    next(error);
  }
});

/**
 * This path gets recipeId and delete this recipe from the family list of the logged-in user
 */
router.delete('/family', async (req,res,next) => {
  try{
    // Check if the recipeId is in the family list
    const recipe_id = req.body.recipeId;
    if (!(recipe_id in user_utils.getFamilyRecipes(req.session.user_id))){
      return res.status(409).send("You have not saved this recipe as family yet");
    }
    const user_id = req.session.user_id;
    await user_utils.removeFromFamily(user_id,recipe_id);
    res.status(200).send("The Recipe successfully removed from family");
  } catch(error){
    next(error);
  }
});

/**
 * This path gets recipeId and add new recipe (created by user) to my reciipes list of the logged-in user
 */
router.post('/myRecipes', async (req,res,next) => {
  try{
    // Check if the user is logged in
    if (!req.session || !req.session.user_id)
      return res.status(401).send("User not logged in");
    
    const creator_id = req.session.user_id;
    const { title, photo, preparation_time, groceries_list, preparation_instructions, isVegan, isVegetarian, isGlutenFree } = req.body;

    await DButils.execQuery(`INSERT INTO recipes (title, photo, preparation_time, groceries_list, preparation_instructions, creator_id, isVegan, isVegetarian, isGlutenFree)
      VALUES ('${title}', '${photo}', ${preparation_time}, '${groceries_list}', '${preparation_instructions}', ${creator_id}, ${isVegan}, ${isVegetarian}, ${isGlutenFree})`);
    res.status(201).send("Recipe created successfully");
    } catch(error){
    next(error);
  }
});

/**
 * This path returns the my recipes that were saved by the logged-in user
 */
router.get('/myRecipes', async (req,res,next) => {
  try{
    if (!req.session || !req.session.user_id)
      return res.status(401).send("User not logged in");
    const recipes = await user_utils.getMyRecipes(req.session.user_id);
    res.status(200).send(recipes);
  } catch(error){
    next(error); 
  }
});

/**
 * This path gets recipeId and delete this recipe from the my recipes list of the logged-in user
 */
router.delete('/myRecipes/:recipeId', async (req,res,next) => {
  try{
    // Check if the user is logged in
    if (!req.session || !req.session.user_id)
      return res.status(401).send("User not logged in");
    const recipe_id = req.params.recipeId;
    const user_id = req.session.user_id;
    // Check if the recipe created by the user
    const result = await DButils.execQuery(`SELECT * FROM recipes WHERE recipe_id = ${recipe_id} AND creator_id = ${user_id}`);
    if (result.length === 0) {
      return res.status(403).send("You are not authorized to delete this recipe");
    }
    await DButils.execQuery(`DELETE FROM recipes WHERE recipe_id = ${recipe_id}`);
    res.status(200).send("The Recipe successfully removed from recipes");
  } catch(error){
    next(error);
  }
});

/**
 * This path returns the last searches that were made by the logged-in user
 */
router.get("/recent-searches", async (req, res, next) => {
  try {
    const searches = await DButils.execQuery(`
      SELECT DISTINCT search_term
      FROM user_searches
      WHERE user_id = '${req.session.user_id}'
      ORDER BY search_time DESC
      LIMIT 10
    `);
    res.status(200).send(searches.map(s => s.search_term));
  } catch (error) {
    next(error);
  }
});




module.exports = router;
