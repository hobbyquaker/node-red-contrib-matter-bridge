const {Endpoint} = require('@project-chip/matter.js/endpoint');
const {BridgedDeviceBasicInformationServer} = require('@project-chip/matter.js/behavior/definitions/bridged-device-basic-information');
const {OnOffPlugInUnitDevice} = require('@project-chip/matter.js/devices/OnOffPlugInUnitDevice');

module.exports = {
    onoffsocket(child) {
        const device = new Endpoint(
            OnOffPlugInUnitDevice.with(BridgedDeviceBasicInformationServer),
            {
                id: child.id,
                bridgedDeviceBasicInformation: {
                    nodeLabel: child.name,
                    productName: child.name,
                    productLabel: child.name,
                    serialNumber: child.id,
                    reachable: true,
                },
            });
        device.events.onOff.onOff$Changed.on(value => {
            child.emit('state', value);
        });
        device.events.identify.startIdentifying.on(() => {
            child.emit('identify', true);
        });
        device.events.identify.stopIdentifying.on(() => {
            child.emit('identify', false);
        });
        return device;
    },
};
