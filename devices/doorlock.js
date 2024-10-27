
const {Endpoint} = require('@project-chip/matter.js/endpoint');
const {BridgedDeviceBasicInformationServer} = require('@project-chip/matter.js/behavior/definitions/bridged-device-basic-information');
const {DoorLockDevice} = require('@project-chip/matter.js/devices/DoorLockDevice');
//const DoorLock = require( "@project-chip/matter.js/cluster").DoorLock;
//const DoorLockServer = require( "@project-chip/matter.js/behavior/definitions/door-lock").DoorLockServer

module.exports = {
    doorlock(child) {
        const device = new Endpoint(DoorLockDevice.with(BridgedDeviceBasicInformationServer), {
            id: child.id,
            bridgedDeviceBasicInformation: {
                nodeLabel: child.name,
                productName: child.name,
                productLabel: child.name,
                serialNumber: child.id,
                reachable: true,
            },
            doorLock: {
                lockType: 2,
                actuatorEnabled: true,
            },
        });

        device.events.identify.startIdentifying.on(() => {
            child.emit('identify', true);
        });
        device.events.identify.stopIdentifying.on(() => {
            child.emit('identify', false);
        });

        device.events.doorLock.lockState$Changed.on(value => {
            const states = {0: 'unlocked', 1: 'locked', 2: 'unlocked'};
            child.emit('state', states[value]);
        });

        return device;
    },
};
