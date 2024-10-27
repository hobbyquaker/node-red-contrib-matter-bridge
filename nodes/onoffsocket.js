const {logEndpoint} = require('@project-chip/matter.js/device');
const {EndpointServer} = require('@project-chip/matter.js/endpoint');

module.exports = function (RED) {
    function MatterOnOffSocket(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node.bridge = RED.nodes.getNode(config.bridge);
        node.name = config.name;
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
                if (message.payload.state == undefined || typeof (message.payload) !== 'object') {
                    message.payload = state = {state: message.payload};
                }

                if (typeof message.payload.state === 'boolean') {
                    node.device.set({
                        onOff: {
                            onOff: message.payload.state,
                        },
                    });
                } else {
                    switch (message.payload.state) {
                        case '1':
                        case 1:
                        case 'on': {
                            node.device.set({
                                onOff: {
                                    onOff: true,
                                },
                            });
                            break;
                        }

                        case '0':
                        case 0:
                        case 'off': {
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
            }
        });
        this.on('serverReady', function () {
            this.status({fill: 'green', shape: 'dot', text: 'ready'});
        });
        this.on('state', data => {
            if ((node.pending && node.passthrough)) {
                var message = node.pendingmsg;
                message.payload.state = data;
                node.send(message);
            } else if (!node.pending) {
                var message = {payload: {}};
                message.payload.state = data;
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
            this.removeAllListeners('state');
            this.removeAllListeners('serverReady');
            this.removeAllListeners('identify');
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

    RED.nodes.registerType('matteronoffsocket', MatterOnOffSocket);
};
