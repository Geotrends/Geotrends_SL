const express = require("express");
const router = express.Router();
const { generarInforme } = require("../controllers/informesController");

router.post("/informe-pdf", generarInforme);

module.exports = router;