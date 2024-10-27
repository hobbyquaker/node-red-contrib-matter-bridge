const {logEndpoint} = require('@project-chip/matter.js/device');
const {EndpointServer} = require('@project-chip/matter.js/endpoint');

module.exports = function (RED) {
    function MatterDoorLock(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node.bridge = RED.nodes.getNode(config.bridge);
        node.name = config.name;
        console.log(`Loading Device node ${node.id}`);
        node.status({fill: 'red', shape: 'ring', text: 'not running'});
        node.pending = false;
        node.pendingmsg = null;
        node.passthrough = /^true$/i.test(config.passthrough);
        this.on('input', message => {
            if (message.topic == 'state') {
                if (message.payload) {
                    node.device.set(message.payload);
                }

                message.payload = node.device.state;
                node.send(message);
                logEndpoint(EndpointServer.forEndpoint(node.bridge.matterServer));
            } else {
                node.pending = true;
                node.pendingmsg = message;
                if (message.payload.state == undefined || typeof (message.payload) !== 'object') {
                    message.payload = state = {state: message.payload};
                }

                switch (message.payload.state) {
                    case '1':
                    case 1:
                    case 'lock':
                    case 'locked':
                    case true: {
                        node.device.set({
                            doorLock: {
                                lockState: 1,
                            },
                        });
                        break;
                    }

                    case '0':
                    case 0:
                    case 'unlock':
                    case 'unlocked':
                    case false: {
                        node.device.set({
                            doorLock: {
                                lockState: 2,
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

    RED.nodes.registerType('matterdoorlock', MatterDoorLock);
};
