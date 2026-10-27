const express = require('express');
const {
  importRackSpace,
  getAllRackSpace,
  getRackSpaceByStyle,
} = require('../../controllers/rackSpace/rackSpace.controller');

const router = express.Router();

router.post('/import', importRackSpace);
router.get('/', getAllRackSpace);
router.get('/:styleNumber', getRackSpaceByStyle);

module.exports = router;
