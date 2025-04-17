const bcrypt = require('bcryptjs');

const password = 'geotrends.2024'; // Aquí tu contraseña segura

bcrypt.genSalt(10, (err, salt) => {
  bcrypt.hash(password, salt, (err, hash) => {
    console.log('Hash generado:', hash);
  });
});
