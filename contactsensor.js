
module.exports = function(RED) {
    function MatterContactSensor(config) {
        RED.nodes.createNode(this,config);

        var node = this;
        node.bridge = RED.nodes.getNode(config.bridge);
        node.name = config.name
        node.initial = config.initial == "true";
        console.log(`Loading Device node ${node.id}`)
        console.log(`INITIAL STATE: ${config.initial}`)

        node.status({fill:"red",shape:"ring",text:"not running"});
        this.on('input', function(msg) {
            node.device.set({booleanState: {stateValue: msg.payload}})
        });
        this.on('serverReady', function() {
            this.status({fill:"green",shape:"dot",text:"ready"});
        })
        

        this.on('identify', function(data){
            if (data){
                this.status({fill:"blue",shape:"dot",text:"identify"});
            } else {
                this.status({fill:"green",shape:"dot",text:"ready"});
            }
            
        })


        this.on('close', function(removed, done) {
            this.removeAllListeners('serverReady')
            this.removeAllListeners('identify')
            if (removed) {
                // This node has been disabled/deleted
            } else {
                // This node is being restarted
            }
            done();
        });
        //Wait till server is started
        function waitforserver(node) {
            if (!node.bridge.serverReady) {
              setTimeout(waitforserver, 100, node)
            } else {
                console.log('Registering Child......')
                node.bridge.emit('registerChild', node)
            }
        }
        waitforserver(node)
        
    }
    RED.nodes.registerType("mattercontactsensor",MatterContactSensor);
}