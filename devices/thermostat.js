
const {Endpoint} = require('@project-chip/matter.js/endpoint');
const {BridgedDeviceBasicInformationServer} = require('@project-chip/matter.js/behavior/definitions/bridged-device-basic-information');
const {ThermostatDevice} = require('@project-chip/matter.js/devices/ThermostatDevice');
const {Thermostat} = require('@project-chip/matter.js/cluster');
const {ThermostatServer} = require('@project-chip/matter.js/behavior/definitions/thermostat');

module.exports = {
    thermostat(child) {
        const features = [];
        if (child.heat) {
            features.push(Thermostat.Feature.Heating);
        }

        if (child.cool) {
            features.push(Thermostat.Feature.Cooling);
        }

        const parameters = {
            systemMode: 0,
            localTemperature: 1800,
        };
        if (child.cool && !child.heat) {
            parameters.controlSequenceOfOperation = 0;
        } else if (!child.cool && child.heat) {
            parameters.controlSequenceOfOperation = 2;
        } else if (child.cool && child.heat) {
            parameters.controlSequenceOfOperation = 4;
        }

        child.heat ? parameters.minHeatSetpointLimit = 500 : null;
        child.heat ? parameters.maxHeatSetpointLimit = 3500 : null;
        child.heat ? parameters.absMinHeatSetpointLimit = 500 : null;
        child.heat ? parameters.absMaxHeatSetpointLimit = 3500 : null;
        child.cool ? parameters.minCoolSetpointLimit = 0 : null;
        child.cool ? parameters.absMinCoolSetpointLimit = 0 : null;
        child.cool ? parameters.maxCoolSetpointLimit = 2100 : null;
        child.cool ? parameters.absMaxCoolSetpointLimit = 2100 : null;

        const device = new Endpoint(ThermostatDevice.with(BridgedDeviceBasicInformationServer, ThermostatServer.with(
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
            thermostat: {
                ...parameters,
            },
        });

        device.events.identify.startIdentifying.on(() => {
            child.emit('identify', true);
        });
        device.events.identify.stopIdentifying.on(() => {
            child.emit('identify', false);
        });

        device.events.thermostat.systemMode$Changed.on(value => {
            child.emit('mode', value);
        });

        if (child.heat) {
            device.events.thermostat.occupiedHeatingSetpoint$Changed.on(value => {
                child.emit('temp', 'heat', value);
            });
        }

        if (child.cool) {
            device.events.thermostat.occupiedCoolingSetpoint$Changed.on(value => {
                child.emit('temp', 'cool', value);
            });
        }

        return device;
    },
};
