const express = require('express');
const router = express.Router();
const { getTourPlan } = require('../controllers/industria/industria360Controller');

router.get('/tour-plan', getTourPlan);

module.exports = router;
