const bcrypt = require('bcryptjs');

const contraseñaIngresada = 'geotrends.2024';
const hashEnBD = '$2b$10$4lyH/8XJjqubVGKfaGG5YugIZpNEz2sC0zTL1GffLV9eFRvIYbbTq';

bcrypt.compare(contraseñaIngresada, hashEnBD, (err, resultado) => {
  if (resultado) {
    console.log('✅ Coinciden, la contraseña es válida.');
  } else {
    console.log('❌ NO coinciden, algo está mal.');
  }
});
