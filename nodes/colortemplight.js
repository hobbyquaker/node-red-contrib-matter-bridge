const {logEndpoint} = require('@project-chip/matter.js/device');
const {EndpointServer} = require('@project-chip/matter.js/endpoint');

module.exports = function (RED) {
    function MatterColorTemporaryLight(config) {
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
                }

                if (node.range == '100') {
                    message.payload.level = Math.round(message.payload.level * 2.54);
                }

                if (message.payload.temp) {
                    var mireds = 1_000_000 / message.payload.temp;
                } else {
                    var mireds = node.device.state.colorControl.colorTemperatureMireds;
                }

                node.device.set({
                    levelControl: {
                        currentLevel: message.payload.level,
                    },
                    colorControl: {
                        colorTemperatureMireds: mireds,
                    },
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

                message.payload.temp = Math.floor(1_000_000 / node.device.state.colorControl.colorTemperatureMireds);
                node.send(message);
            } else if (!node.pending) {
                var message = {payload: {}};
                message.payload.state = node.device.state.onOff.onOff;
                message.payload.level = node.device.state.levelControl.currentLevel;
                if (node.range == '100') {
                    message.payload.level = Math.round(message.payload.level / 2.54);
                }

                message.payload.temp = Math.floor(1_000_000 / node.device.state.colorControl.colorTemperatureMireds);
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

    RED.nodes.registerType('mattercolortemplight', MatterColorTemporaryLight);
};
