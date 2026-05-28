import 'dotenv/config';
import { createApp } from './app';

const app = createApp();
const port = Number(process.env.PORT ?? 3333);

app.listen(port, () => {
   // eslint-disable-next-line no-console
   console.log(`HTTP server running on port ${port}`);
});
