import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {verifyUserByRefreshToken} from './authController.js'
import Files from '../models/files.js';

const __dirname = process.env.PWD;
const uploadFolderDir = path.join(__dirname, 'uploads/');

multer({dest: uploadFolderDir});

/**
 * Add a new file to DB
 * @param user
 * @param file
 * @param fileName
 * @param uploadPath
 * @returns {Promise<{errorText: string, isError: boolean, file: {}}>}
 */
const addFileToDb = async (user, file, fileName, uploadPath) => {
    let response = {isError: false, errorText: '', file: {}}

    try {
        // Create new File record in database
        response.file = await Files.create({
            user_id: user.id,
            name: fileName,
            extension: path.extname(uploadPath),
            mimeType: file.mimetype,
            size: file.size,
        });

    } catch (e) {
        response.isError = true;
        response.errorText = e;
    }

    return response;
}

/**
 * Update existing file in DB
 * @param oldFileDb
 * @param newFile
 * @param uploadPath
 * @returns {Promise<{errorText: string, isError: boolean, updatedFile: {}}>}
 */
const updateFileInDB = async (oldFileDb, newFile, newFileName, uploadPath) => {
    let response = {isError: false, errorText: '', updatedFile: {}}

    try {
        response.updatedFile = await oldFileDb.update({
            name: newFileName,
            extension: path.extname(uploadPath),
            mimeType: newFile.mimeType,
            size: newFile.size,
        });

    } catch (e) {
        response.isError = true;
        response.errorText = e;
    }

    return response;
}

/**
 * Working for only authorized users
 *
 * @type {{deleteFile(*, *): Promise<*|undefined>, downloadFile(*, *): Promise<*|undefined>, uploadFile(*, *): Promise<*>, getFileById(*, *): Promise<*|undefined>, getFileList(*, *): Promise<*>}}
 */
const filesController = {

    /**
     * @param req
     * @param res
     * @returns {Promise<*>}
     */
    async uploadFile(req, res) {
        try {
            if (!req.files || Object.keys(req.files).length === 0) {
                return res.status(+process.env.BAD_REQUEST_STATUS_CODE).json({error: 'Bad request, file not uploaded.'});
            }

            const refreshToken = req.cookies.refreshToken;
            const verifiedUser = await verifyUserByRefreshToken(refreshToken);

            if (verifiedUser.isError) {
                return res.status(+process.env.UNAUTHORIZED_STATUS_CODE).json({message: verifiedUser.errorText});
            }

            const file = req.files.file;
            const fileName = path.parse(file.name).name + '_' + new Date().getTime();
            const uploadPath = path.join(uploadFolderDir, fileName + path.extname(file.name));

            // Save file
            await file.mv(uploadPath);
            //Create new File record in database
            const newFile = await addFileToDb(verifiedUser.user, file, fileName, uploadPath)

            if (newFile.isError) {
                console.log(newFile.errorText)
                return res.status(+process.env.SERVER_ERROR_STATUS_CODE).json({error: 'Error during saving file'});
            }

            return res.status(+process.env.CREATED_STATUS_CODE).json({
                message: 'File uploaded successfully',
                file: newFile.file
            });
        } catch (err) {
            console.error(err);
            return res.status(+process.env.SERVER_ERROR_STATUS_CODE).json({error: 'Something went wrong'});
        }
    },

    /**
     *
     * @param req
     * @param res
     * @returns {Promise<*>}
     */
    async getFileList(req, res) {
        try {
            const {page = 1, list_size = 10} = req.query;
            const refreshToken = req.cookies.refreshToken;
            const verifiedUser = await verifyUserByRefreshToken(refreshToken);

            if (verifiedUser.isError) {
                return res.status(+process.env.UNAUTHORIZED_STATUS_CODE).json({message: verifiedUser.errorText});
            }

            const {rows} = await Files.findAndCountAll({
                where: {
                    user_id: verifiedUser.user.id
                },
                offset: (page - 1) * list_size,
                limit: +list_size,
            });

            return res.json({count: rows.length, rows});
        } catch (err) {
            console.error(err);
            return res.status(+process.env.SERVER_ERROR_STATUS_CODE).json({error: 'Error getting file list'});
        }
    },


    /**
     * Delete files from uploads and DB
     * @param req
     * @param res
     * @returns {Promise<*>}
     */
    async deleteFile(req, res) {
        try {
            const {id} = req.params;
            const refreshToken = req.cookies.refreshToken;
            const verifiedUser = await verifyUserByRefreshToken(refreshToken);

            if (verifiedUser.isError) {
                return res.status(+process.env.UNAUTHORIZED_STATUS_CODE).json({message: verifiedUser.errorText});
            }

            const file = await Files.findOne({
                where: {
                    id,
                    user_id: verifiedUser.user.id,
                },
            });

            if (!file) {
                return res.status(+process.env.NOT_FOUND_STATUS_CODE).json({error: 'File not found'});
            }

            const fileNameWithExt = file.name + file.extension;
            const filePath = path.join(uploadFolderDir, fileNameWithExt);

            //Remove file
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(path.join(uploadFolderDir, fileNameWithExt));
            }

            //Remove from DB
            await file.destroy();

            return res.json({message: 'File deleted'});
        } catch (err) {
            console.error(err);
            return res.status(+process.env.SERVER_ERROR_STATUS_CODE).json({error: 'Error deleting file'});
        }
    },

    /**
     * @param req
     * @param res
     * @returns {Promise<*>}
     */
    async getFileById(req, res) {
        try {
            const {id} = req.params;
            const refreshToken = req.cookies.refreshToken;
            const verifiedUser = await verifyUserByRefreshToken(refreshToken);

            if (verifiedUser.isError) {
                return res.status(+process.env.UNAUTHORIZED_STATUS_CODE).json({message: verifiedUser.errorText});
            }

            const file = await Files.findOne({
                where: {
                    id,
                    user_id: verifiedUser.user.id,
                },
            });

            if (!file) {
                return res.status(+process.env.NOT_FOUND_STATUS_CODE).json({error: 'File not found'});
            }

            return res.json(file);
        } catch (err) {
            console.error(err);
            return res.status(+process.env.SERVER_ERROR_STATUS_CODE).json({error: 'Error getting file'});
        }
    },

    /**
     * @param req
     * @param res
     * @returns {Promise<*>}
     */
    async downloadFile(req, res) {
        try {
            const {id} = req.params;
            const refreshToken = req.cookies.refreshToken;
            const verifiedUser = await verifyUserByRefreshToken(refreshToken);

            if (verifiedUser.isError) {
                return res.status(+process.env.UNAUTHORIZED_STATUS_CODE).json({message: verifiedUser.errorText});
            }

            const file = await Files.findOne({
                where: {
                    id,
                    user_id: verifiedUser.user.id,
                },
            });

            const filePath = uploadFolderDir + file.name + file.extension

            if (!file || !fs.existsSync(filePath)) {
                return res.status(+process.env.NOT_FOUND_STATUS_CODE).json({error: 'File not found'});
            }

            res.download(filePath);
        } catch (err) {
            console.error(err);
            res.status(+process.env.SERVER_ERROR_STATUS_CODE).json({error: 'Error downloading file'});
        }
    },


    /**
     *
     * @param req
     * @param res
     * @returns {Promise<*>}
     */
    async updateFile(req, res) {
        try {
            const {id} = req.params;

            if (!req.files || Object.keys(req.files).length === 0) {
                return res.status(+process.env.BAD_REQUEST_STATUS_CODE).json({error: 'Bad request, file not uploaded.'});
            }

            const refreshToken = req.cookies.refreshToken;
            const verifiedUser = await verifyUserByRefreshToken(refreshToken);

            if (verifiedUser.isError) {
                return res.status(+process.env.UNAUTHORIZED_STATUS_CODE).json({message: verifiedUser.errorText});
            }

            const oldFileDb = await Files.findByPk(id);
            if (!oldFileDb) {
                return res.status(+process.env.NOT_FOUND_STATUS_CODE).send('Old file not found in DB');
            }

            const oldFileNameWithExt = oldFileDb.name + oldFileDb.extension;
            const filePath = path.join(uploadFolderDir, oldFileNameWithExt);

            if (fs.existsSync(filePath)) {
                //Remove file
                fs.unlinkSync(path.join(uploadFolderDir, oldFileNameWithExt));

                const newFile = req.files.file;
                const newFileName = path.parse(newFile.name).name + '_' + new Date().getTime();

                const uploadPath = path.join(uploadFolderDir, newFileName + path.extname(newFile.name));

                // Save file
                await newFile.mv(uploadPath);

                //Update file in DB
                const updateResp = await updateFileInDB(oldFileDb, newFile, newFileName, uploadPath);

                if (updateResp.isError) {
                    console.log(updateResp.errorText)
                    return res.status(+process.env.SERVER_ERROR_STATUS_CODE).json({error: 'Error during update file'});
                }

                return res.json({message: 'File updated successfully', updatedFile: updateResp.updatedFile});
            }

            return res.status(+process.env.NOT_FOUND_STATUS_CODE).send('Old file not found');

        } catch (error) {
            console.error(error);
            res.status(+process.env.SERVER_ERROR_STATUS_CODE).send('Server Error');
        }
    }
}

export default filesController