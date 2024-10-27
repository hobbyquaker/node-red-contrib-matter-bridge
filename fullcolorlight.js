
const {logEndpoint} = require('@project-chip/matter.js/device');
const {EndpointServer} = require('@project-chip/matter.js/endpoint');

module.exports = function (RED) {
    function MatterFullColorLight(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node.bridge = RED.nodes.getNode(config.bridge);
        node.name = config.name;
        node.range = config.range;
        node.pending = false;
        node.pendingmsg = null;
        node.passthrough = /^true$/i.test(config.passthrough);
        console.log(`Loading Device node ${node.id}`);
        node.status({fill: 'red', shape: 'ring', text: 'not running'});
        this.on('input', message => {
            if (message.topic == 'state') {
                message.payload = node.device.state;
                node.send(message);
                logEndpoint(EndpointServer.forEndpoint(node.bridge.matterServer));
            } else {
                node.pending = true;
                node.pendingmsg = message;
                if (message.payload.state == undefined) {
                    message.payload.state = node.device.state.onOff.onOff;
                }

                if (message.payload.level == undefined) {
                    message.payload.level = node.device.state.levelControl.currentLevel;
                } else if (node.range == '100') {
                    message.payload.level = Math.round(message.payload.level * 2.54);
                }

                if ((message.payload.hue || message.payload.sat) && message.payload.temp) {
                    node.error('Can\'t set Colour Temp and Hue/Sat at same time');
                } else if (message.payload.hue || message.payload.sat) {
                    message.payload.hue = message.payload.hue ? message.payload.hue : node.device.state.colorControl.currentHue;
                    message.payload.sat = message.payload.sat ? message.payload.sat : node.device.state.colorControl.currentSaturation;
                    newcolor = {
                        colorMode: 0,
                        currentHue: message.payload.hue,
                        currentSaturation: message.payload.sat,
                    };
                } else if (message.payload.temp) {
                    newcolor = {
                        colorMode: 2,
                        colorTemperatureMireds: 1_000_000 / message.payload.temp,
                    };
                } else {
                    newcolor = {colorMode: node.device.state.colorControl.colorMode};
                }

                node.device.set({
                    levelControl: {
                        currentLevel: message.payload.level,
                    },
                    colorControl: newcolor,
                });

                switch (message.payload.state) {
                    case '1':
                    case 1:
                    case 'on':
                    case true: {
                        node.device.set({
                            onOff: {
                                onOff: true,
                            },
                        });
                        break;
                    }

                    case '0':
                    case 0:
                    case 'off':
                    case false: {
                        node.device.set({
                            onOff: {
                                onOff: false,
                            },
                        });
                        break;
                    }

                    case 'toggle': {
                        node.device.set({
                            onOff: {
                                onOff: !node.device.state.onOff.onOff,
                            },
                        });
                        break;
                    }
                }
            }
        });
        this.on('serverReady', function () {
            this.status({fill: 'green', shape: 'dot', text: 'ready'});
        });
        this.on('state', data => {
            if ((node.pending && node.passthrough)) {
                var message = node.pendingmsg;
                message.payload.state = node.device.state.onOff.onOff;
                message.payload.level = node.device.state.levelControl.currentLevel;
                if (node.range == '100') {
                    message.payload.level = Math.round(message.payload.level / 2.54);
                }

                if (node.device.state.colorControl.colorMode == 0) {
                    message.payload.hue = node.device.state.colorControl.currentHue;
                    message.payload.sat = node.device.state.colorControl.currentSaturation;
                } else if (node.device.state.colorControl.colorMode == 2) {
                    message.payload.temp = Math.floor(1_000_000 / node.device.state.colorControl.colorTemperatureMireds);
                } else {
                    node.error(`Unknown color mode: ${node.device.state.colorControl.colorMode}`);
                }

                node.send(message);
            } else if (!node.pending) {
                var message = {payload: {}};
                message.payload.state = node.device.state.onOff.onOff;
                message.payload.level = node.device.state.levelControl.currentLevel;
                if (node.range == '100') {
                    message.payload.level = Math.round(message.payload.level / 2.54);
                }

                if (node.device.state.colorControl.colorMode == 0) {
                    message.payload.hue = node.device.state.colorControl.currentHue;
                    message.payload.sat = node.device.state.colorControl.currentSaturation;
                } else if (node.device.state.colorControl.colorMode == 2) {
                    message.payload.temp = Math.floor(1_000_000 / node.device.state.colorControl.colorTemperatureMireds);
                } else {
                    node.error(`Unknown color mode: ${node.device.state.colorControl.colorMode}`);
                }

                node.send(message);
            }

            node.pending = false;
        });

        this.on('identify', function (data) {
            if (data) {
                this.status({fill: 'blue', shape: 'dot', text: 'identify'});
            } else {
                this.status({fill: 'green', shape: 'dot', text: 'ready'});
            }
        });

        this.on('close', function (removed, done) {
            this.off('state');
            this.off('serverReady');
            this.off('identify');
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

    RED.nodes.registerType('matterfullcolorlight', MatterFullColorLight);
};
