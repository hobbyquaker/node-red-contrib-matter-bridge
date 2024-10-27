const {Endpoint} = require('@project-chip/matter.js/endpoint');
const {BridgedDeviceBasicInformationServer} = require('@project-chip/matter.js/behavior/definitions/bridged-device-basic-information');
const {HumiditySensorDevice} = require('@project-chip/matter.js/devices/HumiditySensorDevice');
const temperaturesensor = require('../temperaturesensor');

module.exports = {
    humiditysensor(child) {
        const device = new Endpoint(
            HumiditySensorDevice.with(BridgedDeviceBasicInformationServer), {
                id: child.id,
                bridgedDeviceBasicInformation: {
                    nodeLabel: child.name,
                    productName: child.name,
                    productLabel: child.name,
                    serialNumber: child.id,
                    reachable: true,
                },
                relativeHumidityMeasurement: {
                    minMeasuredValue: child.minlevel,
                    maxMeasuredValue: child.maxlevel,

                },
            },
        );
        device.events.identify.startIdentifying.on(() => {
            child.emit('identify', true);
        });
        device.events.identify.stopIdentifying.on(() => {
            child.emit('identify', false);
        });
        return device;
    },
};
