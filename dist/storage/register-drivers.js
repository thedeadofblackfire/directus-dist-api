"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDrivers = void 0;
const env_1 = require("../env");
const get_storage_driver_1 = require("./get-storage-driver");
const registerDrivers = async (storage) => {
    const env = (0, env_1.getEnv)();
    const usedDrivers = [];
    for (const [key, value] of Object.entries(env)) {
        if ((key.startsWith('STORAGE_') && key.endsWith('_DRIVER')) === false)
            continue;
        if (value && usedDrivers.includes(value) === false)
            usedDrivers.push(value);
    }
    if (process.env['VERCEL'] || (process.env['VERCEL_REGION'] && process.env['VERCEL_REGION'] == 'dev1')) {
        console.log('usedDrivers', usedDrivers); // usedDrivers [ 'local', 's3' ]
        //storage.registerDriver('local', storageDrivers_local);
        //storage.registerDriver('s3', storageDrivers_s3.default);
        //const { DriverLocal } = await import('@directus/storage-driver-local');
        //const { DriverS3 } = await import('@directus/storage-driver-s3');
        //const { DriverAzure } = await import('@directus/storage-driver-azure');
        //const { DriverGCS } = await import('@directus/storage-driver-gcs');
        //const { DriverCloudinary } = await import('@directus/storage-driver-cloudinary');
        //storage.registerDriver('local', DriverLocal);
        //storage.registerDriver('s3', DriverS3);
        //storage.registerDriver('azure', DriverAzure);
        //storage.registerDriver('gcs', DriverGCS);
        //storage.registerDriver('cloudinary', DriverCloudinary);
        for (const driverName of usedDrivers) {
            switch (driverName) {
                case 'local':
                    const { DriverLocal } = await import('@directus/storage-driver-local');
                    storage.registerDriver('local', DriverLocal);
                    break;
                case 's3':
                    const { DriverS3 } = await import('@directus/storage-driver-s3');
                    storage.registerDriver('s3', DriverS3);
                    break;
                case 'azure':
                    const { DriverAzure } = await import('@directus/storage-driver-azure');
                    storage.registerDriver('azure', DriverAzure);
                    break;
                case 'gcs':
                    const { DriverGCS } = await import('@directus/storage-driver-gcs');
                    storage.registerDriver('gcs', DriverGCS);
                    break;
                case 'cloudinary':
                    const { DriverCloudinary } = await import('@directus/storage-driver-cloudinary');
                    storage.registerDriver('cloudinary', DriverCloudinary);
                    break;
            }
        }
    }
    else {
        for (const driverName of usedDrivers) {
            const storageDriver = await (0, get_storage_driver_1.getStorageDriver)(driverName);
            if (storageDriver) {
                storage.registerDriver(driverName, storageDriver);
            }
        }
    }
};
exports.registerDrivers = registerDrivers;
