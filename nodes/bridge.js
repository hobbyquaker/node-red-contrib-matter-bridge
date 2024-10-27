require('@project-chip/matter-node.js');

const {VendorId} = require('@project-chip/matter.js/datatype');
const {Endpoint} = require('@project-chip/matter.js/endpoint');
const {AggregatorEndpoint} = require('@project-chip/matter.js/endpoints/AggregatorEndpoint');
const MatterEnvironment = require('@project-chip/matter.js/environment').Environment;
const {ServerNode} = require('@project-chip/matter.js/node');
const {Logger} = require('@project-chip/matter.js/log');
const os = require('node:os');
const {doorlock} = require('../devices/doorlock.js');
const {thermostat} = require('../devices/thermostat.js');
const {contactsensor} = require('../devices/contactsensor.js');
const {colortemplight} = require('../devices/colortemplight.js');
const {fullcolorlight} = require('../devices/fullcolorlight.js');
const {dimmablelight} = require('../devices/dimmablelight.js');
const {onoffsocket} = require('../devices/onoffsocket.js');
const {onofflight} = require('../devices/onofflight.js');
const {lightsensor} = require('../devices/lightsensor.js');
const {genericswitch} = require('../devices/genericswitch.js');
const {windowcovering} = require('../devices/windowcovering.js');
const {humiditysensor} = require('../devices/humiditysensor.js');
const {pressuresensor} = require('../devices/pressuresensor.js');
const {occupancysensor} = require('../devices/occupancysensor.js');
const {temperaturesensor} = require('../devices/temperaturesensor.js');

function genPasscode() {
    let x = Math.floor(Math.random() * (99_999_998 - 1) + 1);
    invalid = [11_111_111, 22_222_222, 33_333_333, 44_444_444, 55_555_555, 66_666_666, 77_777_777, 88_888_888, 12_345_678, 87_654_321];
    if (invalid.includes(x)) {
        x += 1;
    }

    const xx = x.toString().padStart(8, '0');
    return Number(xx);
}

module.exports = function (RED) {
    function MatterBridge(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        if (node.restart) {
            console.log('Bridge Node Restarted');
        }

        node.restart = false;
        switch (config.logLevel) {
            case 'FATAL': {
                Logger.defaultLogLevel = 5;
                break;
            }

            case 'ERROR': {
                Logger.defaultLogLevel = 4;
                break;
            }

            case 'WARN': {
                Logger.defaultLogLevel = 3;
                break;
            }

            case 'INFO': {
                Logger.defaultLogLevel = 1;
                break; 1;
            }

            case 'DEBUG': {
                Logger.defaultLogLevel = 0;
                break;
            }
        }

        console.log(`Loading Bridge node ${node.id}`);
        //Params
        node.users = config._users;
        node.name = config.name;
        node.vendorId = Number(config.vendorId);
        node.productId = Number(config.productId);
        node.vendorName = config.vendorName;
        node.productName = config.productName;
        node.networkInterface = config.networkInterface;
        node.port = 5540;
        node.passcode = genPasscode();
        node.discriminator = Number(Math.floor(Math.random() * 4095).toString().padStart(4, '0'));
        //Storage TODO: Refactor to use node-red node storage
        //node.storage= new Storage.StorageBackendDisk("storage-"+node.id)
        //const storageManager = new Storage.StorageManager(node.storage);
        //storageManager.initialize().then(() => {
        //    node.deviceStorage = storageManager.createContext("Device")

        node.serverReady = false;
        MatterEnvironment.default.vars.set('mdns.networkInterface', node.networkInterface);
        //Servers
        ServerNode.create({
            id: node.id,
            network: {
                port: node.port,
            },
            commissioning: {
                passcode: node.passcode,
                discriminator: node.discriminator,
            },
            productDescription: {
                name: node.name,
                deviceType: AggregatorEndpoint.deviceType,
            },
            basicInformation: {
                vendorName: 'Node-RED Matter Bridge',
                vendorId: VendorId(node.vendorId),
                nodeLabel: node.name,
                productName: node.name,
                productLabel: node.name,
                productId: node.productId,
                serialNumber: `noderedmatter-${node.id}`,
                uniqueId: node.id,
            },
        })
            .then(matterServer => {
                node.aggregator = new Endpoint(AggregatorEndpoint, {id: 'aggregator'});
                node.matterServer = matterServer;
                node.matterServer.add(node.aggregator);
                console.log('Bridge Created, awaiting child nodes');
                console.log('Server Ready');
                node.serverReady = true;
            });
        console.log('Trying');
        if (node.users.length === 0 && node.serverReady) {
            console.log('Starting Bridge');
            node.matterServer.start();
            for (const x of node.registered) {
                x.emit('serverReady');
            }
        } else {
            console.log('Not Starting yet, more devices to load');
        }

        node.registered = [];

        this.on('registerChild', child => {
            console.log(`Registering ${child.id} with ${node.id}`);
            node.registered.push(child);
            const index = node.users.indexOf(child.id);
            if (index > -1) {
                node.users.splice(index, 1);
            }

            switch (child.type) {
                case 'matteronofflight': {
                    child.device = onofflight(child);
                    break;
                }

                case 'matteronoffsocket': {
                    child.device = onoffsocket(child);
                    break;
                }

                case 'matterdimmablelight': {
                    child.device = dimmablelight(child);
                    break;
                }

                case 'matterfullcolorlight': {
                    child.device = fullcolorlight(child);
                    break;
                }

                case 'mattercolortemplight': {
                    child.device = colortemplight(child);
                    break;
                }

                case 'mattercontactsensor': {
                    child.device = contactsensor(child);
                    break;
                }

                case 'matterlightsensor': {
                    child.device = lightsensor(child);
                    break;
                }

                case 'mattertemperaturesensor': {
                    child.device = temperaturesensor(child);
                    break;
                }

                case 'matteroccupancysensor': {
                    child.device = occupancysensor(child);
                    break;
                }

                case 'matterpressuresensor': {
                    child.device = pressuresensor(child);
                    break;
                }

                case 'matterhumiditysensor': {
                    child.device = humiditysensor(child);
                    break;
                }

                case 'mattergenericswitch': {
                    child.device = genericswitch(child);
                    break;
                }

                case 'matterwindowcovering': {
                    child.device = windowcovering(child);
                    break;
                }

                case 'matterthermostat': {
                    child.device = thermostat(child);
                    break;
                }

                case 'matterdoorlock': {
                    child.device = doorlock(child);
                    break;
                }
            }

            console.log('adding device to aggregator');
            node.aggregator.add(child.device);
            console.log('Trying');
            if (node.users.length === 0 && node.serverReady) {
                console.log('Starting Bridge');
                node.matterServer.start();
                for (const x of node.registered) {
                    x.emit('serverReady');
                }
            } else {
                console.log('Not Starting yet, , more devices to load');
            }
        });

        this.on('close', (removed, done) => {
            if (removed) {
                console.log('Bridge Removed');
                node.matterServer.close();
            } else {
                console.log('Bridge Restarted');
                node.restart = true;
                node.matterServer.close();
            }

            done();
        });
    }

    RED.nodes.registerType('matterbridge', MatterBridge);

    RED.httpAdmin.get('/_matterbridge/commisioning/:id', RED.auth.needsPermission('admin.write'), (request, res) => {
        const target_node = RED.nodes.getNode(request.params.id);
        if (target_node) {
            if (target_node.matterServer.lifecycle.isCommissioned) {
                response = {state: 'commissioned'};
            } else {
                const pairingData = target_node.matterServer.state.commissioning.pairingCodes;
                const {qrPairingCode, manualPairingCode} = pairingData;
                response = {state: 'ready', qrPairingCode, manualPairingCode};
            }

            res.send(response);
        } else {
            res.sendStatus(404);
        }
    });

    RED.httpAdmin.get('/_matterbridge/interfaces', RED.auth.needsPermission('admin.write'), (request, res) => {
        const interfaces = Object.keys(os.networkInterfaces());
        res.send(interfaces);
    });
};
