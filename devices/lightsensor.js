const lightsensor = require("../lightsensor");

const  Endpoint  = require("@project-chip/matter.js/endpoint").Endpoint;
const  BridgedDeviceBasicInformationServer  = require("@project-chip/matter.js/behavior/definitions/bridged-device-basic-information").BridgedDeviceBasicInformationBehavior;
const  LightSensorDevice = require("@project-chip/matter.js/devices/LightSensorDevice").LightSensorDevice

module.exports = {
    lightsensor: function(child) {
        const device = new Endpoint(
            LightSensorDevice.with(BridgedDeviceBasicInformationServer),{
                id: child.id,
                bridgedDeviceBasicInformation: {
                    nodeLabel: child.name,
                    productName: child.name,
                    productLabel: child.name,
                    serialNumber: child.id,
                    reachable: true,
                },
                illuminanceMeasurement: {
                    minMeasuredValue: child.minlevel,
                    maxMeasuredValue: child.maxlevel

                }
            }
            )
            device.events.identify.startIdentifying.on(() => {
                child.emit('identify', true)
            });
            device.events.identify.stopIdentifying.on(() => {
                child.emit('identify', false)
            });
            return device;
    }
 }