import Users from '../models/users.js';
import Files from '../models/files.js';

// Create the Users table
Users.sync({force: false})
    .then(() => {
        console.log('Users created successfully.');
    })
    .catch((error) => {
        console.error('Error creating User table:', error);
    });

// Create the Files table
Files.sync({force: false})
    .then(() => {
        console.log('Files table created successfully.');
    })
    .catch((error) => {
        console.error('Error creating Files table:', error);
    });