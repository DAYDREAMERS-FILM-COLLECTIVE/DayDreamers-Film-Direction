import { app } from './app.js';

const PORT = process.env.PORT || 8000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Daydreamers Film Club API Server listening on http://0.0.0.0:${PORT}`);
    console.log(`   Public Web: http://localhost:${PORT}/screening.html`);
    console.log(`   Admin CMS:  http://localhost:${PORT}/admin.html`);
});
