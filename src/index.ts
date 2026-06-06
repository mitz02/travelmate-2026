import 'dotenv/config';
import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
  console.log(`TravelMate API running at http://localhost:${config.port}`);
});
