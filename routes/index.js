const router = require('express').Router();

const api_controller = require('../controllers/apiController'),
      auth = require('../auth/auth')

/* Users
____________________________________*/

router.post('/users/login', auth.optional, api_controller.login_route);
router.post('/users/create', auth.optional, api_controller.create_user);
router.get('/users/read', auth.required, api_controller.read_user);
router.put('/users/edit', auth.required, api_controller.edit_user);

/* Symptoms
____________________________________*/

router.post('/symptoms/create', auth.optional, api_controller.create_symptom);
router.get('/symptoms/read', auth.optional, api_controller.read_symptom);
router.put('/symptoms/update', auth.optional, api_controller.update_symptom);
router.delete('/symptoms/delete', auth.optional, api_controller.delete_symptom);

/* User Data
____________________________________*/

router.post('/items/create', auth.required, api_controller.create_item)
//router.get('/items/read', auth.required, api_controller.read_items)
router.get('/items/read', auth.required, api_controller.read_items)
router.get([
  '/items/:category',
  '/items/:category/:date_range'
], auth.required, api_controller.read_items)

/* Google Data
____________________________________*/


router.get('/get_google_code', auth.required, api_controller.get_google_code);
router.get('/get_google_auth', auth.required, api_controller.get_google_auth);

router.get('/move_data_from_google', auth.required, api_controller.move_data_from_google);
router.get('/get_range_data', auth.required, api_controller.get_range_data);


//router.get('/api/get_token', auth.required, api_controller.get_token);
//router.get('/api/get_data', auth.required, api_controller.return_data);



// GET home page.
//router.get('/', function(res, req, next){
//    res.json('api home')
//});



// GET stats page.
//router.get('/stats', function(res, req, next){
//    res.json('home_controller.view_stats')
//});

//router.get('/data', function(res, req, next){
//    res.json('stats_controller.data_get')
//});




module.exports = router;
