import express from 'express';
import authRoutes from './src/routes/authRoutes.js';
import fileRoutes from './src/routes/fileRoutes.js';
import fileUpload from 'express-fileupload';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

dotenv.config();
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());
// With default options
app.use(fileUpload());

app.use(express.json());
app.use('/auth', authRoutes);
app.use('/file', fileRoutes);

app.listen(PORT, (e) => {
    if (e) console.log(e);
    console.log(`Server has been started in port ${PORT}`);
});