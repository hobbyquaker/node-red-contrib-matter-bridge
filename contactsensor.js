const {logEndpoint} = require('@project-chip/matter.js/device');
const {EndpointServer} = require('@project-chip/matter.js/endpoint');

module.exports = function (RED) {
    function MatterContactSensor(config) {
        RED.nodes.createNode(this, config);

        const node = this;
        node.bridge = RED.nodes.getNode(config.bridge);
        node.name = config.name;
        node.initial = config.initial == 'true';
        console.log(`Loading Device node ${node.id}`);
        console.log(`INITIAL STATE: ${config.initial}`);

        node.status({fill: 'red', shape: 'ring', text: 'not running'});
        this.on('input', message => {
            if (message.topic == 'state') {
                message.payload = node.device.state;
                node.send(message);
                logEndpoint(EndpointServer.forEndpoint(node.bridge.matterServer));
            } else {
                node.device.set({booleanState: {stateValue: message.payload}});
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

        this.on('close', function (removed, done) {
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

    RED.nodes.registerType('mattercontactsensor', MatterContactSensor);
};
