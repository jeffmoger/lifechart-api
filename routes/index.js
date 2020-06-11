const router = require('express').Router();

const api_controller = require('../controllers/apiController'),
      auth = require('../auth/auth')



/* Users
____________________________________*/

router.post('/api/users/login', auth.optional, api_controller.login_route);

router.post('/api/users/create', auth.optional, api_controller.create_user);


/* Data
____________________________________*/

router.get('/api/data', auth.required, api_controller.data_get);
router.get('/api/get_google_code', auth.required, api_controller.get_google_code);
router.get('/api/get_google_auth', auth.required, api_controller.get_google_auth);

router.get('/api/get_token', auth.required, api_controller.get_token);
//router.get('/api/get_data', auth.required, api_controller.return_data);





// GET home page.
router.get('/', function(res, req, next){
    res.json('api home')
});

// GET stats page.
router.get('/stats', function(res, req, next){
    res.json('home_controller.view_stats')
});

router.get('/data', function(res, req, next){
    res.json('stats_controller.data_get')
});




module.exports = router;
