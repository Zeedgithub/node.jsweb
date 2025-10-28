import { createPool } from 'mysql2/promise';

export const conn = createPool({
    connectionLimit: 10,
    host: '202.28.34.203',
    user: 'mb68_65011212116',
    password: '4fs5$$qozC^O',
    database: 'mb68_65011212116'
});

//server สำรอง
// export const conn = createPool({
//     connectionLimit: 10,
//     host: 'sql12.freesqldatabase.com',
//     user: 'sql12800455',
//     password: 'tdDmuZjzFT',
//     database: 'sql12800455',
//     port: 3306,  
// });