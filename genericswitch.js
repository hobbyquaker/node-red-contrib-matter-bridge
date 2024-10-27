const {logEndpoint} = require('@project-chip/matter.js/device');
const {EndpointServer} = require('@project-chip/matter.js/endpoint');

module.exports = function (RED) {
    function MatterGenericSwitch(config) {
        RED.nodes.createNode(this, config);

        const node = this;
        node.bridge = RED.nodes.getNode(config.bridge);
        node.name = config.name;
        node.switchtype = config.switchtype;
        node.positions = Number(config.positions);
        node.multiPressMax = Number(config.multiPressMax);
        node.longPressDelay = Number(config.longPressDelay);
        node.multiPressDelay = Number(config.multiPressDelay);
        console.log(`Loading Device node ${node.id}`);
        node.status({fill: 'red', shape: 'ring', text: 'not running'});
        this.on('input', message => {
            if (message.topic == 'state') {
                message.payload = node.device.state;
                node.send(message);
                logEndpoint(EndpointServer.forEndpoint(node.bridge.matterServer));
            } else {
                ep = node.device;
                let t;
                switch (message.payload.type.toLowerCase()) {
                    case 'single': {
                        t = ep.state.switch.longPressDelay / 2;
                        press(ep, 1);
                        setTimeout(press, t, ep, 0);
                        break;
                    }

                    case 'double': {
                        t = ep.state.switch.longPressDelay / 4;
                        press(ep, 1);
                        setTimeout(press, t, ep, 0);
                        setTimeout(press, t * 2, ep, 1);
                        setTimeout(press, t * 3, ep, 0);
                        break;
                    }

                    case 'long': {
                        t = ep.state.switch.multiPressDelay * 1.5;
                        press(ep, 1);
                        setTimeout(press, t, ep, 0);
                        break;
                    }

                    case 'position': {
                        ep.set({switch: {currentPosition: message.payload.position}});
                        break;
                    }
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

    RED.nodes.registerType('mattergenericswitch', MatterGenericSwitch);
};

function press(ep, pos) {
    ep.set({switch: {currentPosition: pos}});
}
