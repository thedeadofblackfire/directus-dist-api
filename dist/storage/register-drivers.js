"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDrivers = void 0;
const env_1 = require("../env");
const get_storage_driver_1 = require("./get-storage-driver");

//const storageDrivers_local = require("@directus/storage-driver-local");
//const storageDrivers_s3 = require("@directus/storage-driver-s3");
//import { default as storageDrivers_local } from '@directus/storage-driver-local';
//import { default as storageDrivers_s3 } from '@directus/storage-driver-s3';

const registerDrivers = async (storage) => {
    const env = (0, env_1.getEnv)();
    const usedDrivers = [];
    for (const [key, value] of Object.entries(env)) {
        if ((key.startsWith('STORAGE_') && key.endsWith('_DRIVER')) === false)
            continue;
        if (value && usedDrivers.includes(value) === false)
            usedDrivers.push(value);
    }
	console.log('usedDrivers', usedDrivers); // usedDrivers [ 'local', 's3' ]
	
	//storage.registerDriver('local', storageDrivers_local);
	//storage.registerDriver('s3', storageDrivers_s3.default);
	const { DriverLocal } = await import('@directus/storage-driver-local');
	const { DriverS3 } = await import('@directus/storage-driver-s3');
	storage.registerDriver('local', DriverLocal);
	storage.registerDriver('s3', DriverS3);
	 
	 
	/*
	import formatTitle from '@directus/format-title';
	storage_local.default
	storage_s3.default
	*/
	
	//storage.registerDriver('local', storageDrivers_local);
	//storage.registerDriver('s3', storageDrivers_s3.default);
	
	/*
    for (const driverName of usedDrivers) {
        const storageDriver = await (0, get_storage_driver_1.getStorageDriver)(driverName);
        if (storageDriver) {
            storage.registerDriver(driverName, storageDriver);
        }
    }
	*/
};
exports.registerDrivers = registerDrivers;
