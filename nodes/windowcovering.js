
module.exports = function (RED) {
    function MatterWindowCovering(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node.bridge = RED.nodes.getNode(config.bridge);
        node.name = config.name;
        node.tilt = config.tilt;
        node.lift = config.lift;
        node.productType = Number(config.productType);
        node.coveringType = Number(config.coveringType);
        node.reversed = config.reversed;
        console.log(`Loading Device node ${node.id}`);
        node.status({fill: 'red', shape: 'ring', text: 'not running'});
        node.pending = false;
        node.passthrough = /^true$/i.test(config.passthrough);
        this.on('input', message => {
            console.log(message.payload);
            if (message.topic == 'state') {
                message.payload = node.device.state;
                node.send(message);
            } else {
                node.pending = true;
                node.pendingmsg = message;
                if (message.payload.liftPosition == undefined) {
                    message.payload.liftPosition = node.device.state.windowCovering.currentPositionLiftPercent100ths;
                }

                if (message.payload.tiltPosition == undefined) {
                    message.payload.tiltPosition = node.device.state.windowCovering.currentPositionTiltPercent100ths;
                }

                node.device.set({
                    windowCovering: {
                        targetPositionLiftPercent100ths: message.payload.liftPosition,
                        targetPositionTiltPercent100ths: message.payload.tiltPosition,
                        currentPositionLiftPercent100ths: message.payload.liftPosition,
                        currentPositionTiltPercent100ths: message.payload.tiltPosition,
                    },
                });
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

        this.on('lift', () => {
            data = {liftPositon: node.device.state.windowCovering.currentPositionLiftPercent100ths, tiltPositon: node.device.state.windowCovering.currentPositionTiltPercent100ths};
            //data = {}
            //data.liftPositon = node.device.state.windowCovering.currentPositionLiftPercent100ths
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
        this.on('tilt', () => {
            data = {};
            data.tiltPositon = node.device.state.windowCovering.currentPositionTiltPercent100ths;
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
        this.on('liftMovement', direction => {
            data = {action: 'lift', direction};
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
        this.on('tiltMovement', direction => {
            data = {action: 'tilt', direction};
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
            this.removeAllListeners('liftMovement');
            this.removeAllListeners('tiltMovement');
            this.removeAllListeners('move');

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

    RED.nodes.registerType('matterwindowcovering', MatterWindowCovering);
};

