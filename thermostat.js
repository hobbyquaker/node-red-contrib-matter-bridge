const thermostat = require('./devices/thermostat');

module.exports = function (RED) {
    function MatterThermostat(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node.bridge = RED.nodes.getNode(config.bridge);
        node.name = config.name;
        node.mode = config.mode;
        node.heat = (config.mode == 'heat' || 'heatcool');
        node.cool = (config.mode == 'cool' || 'heatcool');
        console.log(`Loading Device node ${node.id}`);
        node.status({fill: 'red', shape: 'ring', text: 'not running'});
        node.pending = false;
        node.passthrough = /^true$/i.test(config.passthrough);
        this.on('input', message => {
            if (message.topic == 'state') {
                message.payload = node.device.state;
                node.send(message);
            } else {
                if (message.payload.mode) {
                    node.pending = true;
                    node.pendingmsg = message;
                    let systemMode;
                    switch (message.payload.mode) {
                        case 'heat': {
                            systemMode = 4;
                            break;
                        }

                        case 'cool': {
                            systemMode = 3;
                            break;
                        }

                        case 'off': {
                            systemMode = 0;
                        }

                        default: {
                            systemMode = node.devicestate.thermostat.systemMode;
                            break;
                        }
                    }

                    const values = {systemMode};
                    if (message.payload.setpoint) {
                        if (systemMode == 4) {
                            values.occupiedHeatingSetpoint = message.payload.setpoint;
                        } else if (systemMode == 3) {
                            values.occupiedCoolingSetpoint = message.payload.setpoint;
                        }
                    }

                    node.device.set({
                        thermostat: values,
                    });
                }

                if (message.payload.temperature) {
                    node.device.set({thermostat: {localTemperature: message.payload.temperature}});
                }
            }
        });

        this.on('serverReady', function () {
            this.status({fill: 'green', shape: 'dot', text: 'ready'});
        });

        this.on('identify', function (data) {
            if (data) {
                this.status({fill: 'blue', shape: 'dot', text: 'identify'});
            } else {
                this.status({fill: 'green', shape: 'dot', text: 'ready'});
            }
        });

        this.on('mode', value => {
            const modes = {0: 'off', 3: 'cool', 4: 'heat'};
            data = {mode: modes[value]};
            if (value == 4) {
                data.setpoint = node.device.state.thermostat.occupiedHeatingSetpoint;
            } else if (value == 3) {
                data.setpoint = node.device.state.thermostat.occupiedCoolingSetpoint;
            }

            if ((node.pending && node.passthrough)) {
                var message = node.pendingmsg;
                message.payload = data;
                node.send(message);
            } else if (!node.pending) {
                var message = {payload: {}};
                message.payload = data;
                node.send(message);
            }

            node.pending = false;
        });

        this.on('temp', (mode, value) => {
            data = {mode, setPoint: value};
            if ((node.pending && node.passthrough)) {
                var message = node.pendingmsg;
                message.payload = data;
                node.send(message);
            } else if (!node.pending) {
                var message = {payload: {}};
                message.payload = data;
                node.send(message);
            }

            node.pending = false;
        });

        this.on('close', function (removed, done) {
            this.removeAllListeners('serverReady');
            this.removeAllListeners('identify');
            this.removeAllListeners('mode');
            this.removeAllListeners('temp');

            if (removed) {
                // This node has been disabled/deleted
            } else {
                // This node is being restarted
            }

            done();
        });
        //Wait till server is started
        function waitforserver(node) {
            if (node.bridge.serverReady) {
                console.log('Registering Child......');
                node.bridge.emit('registerChild', node);
            } else {
                setTimeout(waitforserver, 100, node);
            }
        }

        waitforserver(node);
    }

    RED.nodes.registerType('matterthermostat', MatterThermostat);
};

