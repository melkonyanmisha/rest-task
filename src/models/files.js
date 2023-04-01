import {DataTypes} from 'sequelize';
import sequelize from '../db-service/db.js';
import Users from '../models/users.js';

const Files = sequelize.define('files', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    extension: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    mimeType: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    size: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
});

Files.belongsTo(Users, {
    foreignKey: "user_id",
    targetKey: "id"
});

export default Files;