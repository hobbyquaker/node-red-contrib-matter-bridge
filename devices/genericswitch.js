const {BallastConfigurationCluster} = require('@project-chip/matter-node.js/cluster');
const {Endpoint} = require('@project-chip/matter.js/endpoint');
const {BridgedDeviceBasicInformationServer} = require('@project-chip/matter.js/behavior/definitions/bridged-device-basic-information');
const {GenericSwitchDevice} = require('@project-chip/matter.js/devices/GenericSwitchDevice');
const {SwitchServer} = require('@project-chip/matter.js/behavior/definitions/switch');
const {Switch} = require('@project-chip/matter.js/cluster');
const temperaturesensor = require('../temperaturesensor');

module.exports = {
    genericswitch(child) {
        let features = [
            child.switchtype == 'momentary' ? Switch.Feature.MomentarySwitch : Switch.Feature.LatchingSwitch,
            child.switchtype == 'momentary' ? Switch.Feature.MomentarySwitchLongPress : null,
            child.switchtype == 'momentary' ? Switch.Feature.MomentarySwitchRelease : null,
            child.switchtype == 'momentary' ? Switch.Feature.MomentarySwitchMultiPress : null,
        ];
        features = features.filter(Boolean);
        const device = new Endpoint(
            GenericSwitchDevice.with(BridgedDeviceBasicInformationServer, SwitchServer.with(
                ...features,
            )), {
                id: child.id,
                bridgedDeviceBasicInformation: {
                    nodeLabel: child.name,
                    productName: child.name,
                    productLabel: child.name,
                    serialNumber: child.id,
                    reachable: true,
                },
                switch: child.switchtype == 'momentary' ? {
                    longPressDelay: child.longPressDelay, multiPressDelay: child.multiPressDelay, multiPressMax: child.multiPressMax, numberOfPositions: child.positions,
                } : {numberOfPositions: child.positions},
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
