import { config } from './src/config.js';
import { app } from './src/app.js';

app.listen(config.port, () => {
  console.log(`API escuchando en http://localhost:${config.port}`);
});
