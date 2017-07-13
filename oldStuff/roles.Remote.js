let cache = require('inUse/module.cache');
const profiler = require('inUse/screeps-profiler');


function Manager(creep) {
    if (creep.memory.role === "remoteHarvester") {
        harvester(creep);
    } else if (creep.memory.role === "remoteHauler") {
        hauler(creep);
    } else if (creep.memory.role === "pioneer") {
        pioneer(creep);
    } else if (creep.memory.role === "explorer") {
        explorer(creep);
    }
}
module.exports.Manager = profiler.registerFN(Manager, 'managerRemote');

/**
 * @return {null}
 */
function explorer(creep) {
    cache.cacheRoomIntel(creep);
    if (!creep.memory.targetRooms || !creep.memory.destination) {
        creep.memory.targetRooms = Game.map.describeExits(creep.pos.roomName);
        creep.memory.destination = _.sample(creep.memory.targetRooms);
    }
    if (creep.memory.destinationReached !== true) {
        creep.shibMove(new RoomPosition(25, 25, creep.memory.destination), {allowHostile: true});
        if (creep.pos.roomName === creep.memory.destination) {
            creep.memory.destinationReached = true;
        }
    } else {
        cache.cacheRoomIntel(creep);
        creep.memory.destination = undefined;
        creep.memory.targetRooms = undefined;
        creep.memory.destinationReached = undefined;
    }
}
explorer = profiler.registerFN(explorer, 'explorerRemote');

/**
 * @return {null}
 */
function harvester(creep) {
    let source;
    //Invader detection
    invaderCheck(creep);
    if (creep.memory.invaderDetected === true || creep.memory.invaderCooldown < 50) {
        creep.memory.invaderCooldown++;
        creep.shibMove(Game.getObjectById(creep.memory.assignedSpawn));
        creep.memory.destinationReached = false;
        return null;
    } else if (creep.memory.invaderCooldown > 50) {
        creep.memory.invaderCooldown = undefined;
    }
    //Initial move
    if (creep.carry.energy === 0) {
        creep.memory.harvesting = true;
    }
    if (!creep.memory.destinationReached) {
        creep.shibMove(new RoomPosition(25, 25, creep.memory.destination));
        if (creep.pos.roomName === creep.memory.destination) {
            creep.memory.destinationReached = true;
        }
        return null;
    } else if (creep.carry.energy === creep.carryCapacity || creep.memory.harvesting === false) {
        creep.memory.harvesting = false;
        depositEnergy(creep);
    } else {
        if (creep.memory.source) {
            source = Game.getObjectById(creep.memory.source);
            if (source.energy === 0) {
                creep.idleFor(source.ticksToRegeneration + 1)
            } else if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.shibMove(source);
            }
        } else {
            creep.findSource();
        }
    }
}
harvester = profiler.registerFN(harvester, 'harvesterRemote');

/**
 * @return {null}
 */
function hauler(creep) {
    //Invader detection
    if (!_.startsWith(creep.name, 'SK')) {
        invaderCheck(creep);
        if (creep.memory.invaderDetected === true || creep.memory.invaderCooldown < 50) {
            creep.memory.invaderCooldown++;
            creep.shibMove(Game.getObjectById(creep.memory.assignedSpawn));
            creep.memory.destinationReached = false;
            return null;
        } else if (creep.memory.invaderCooldown > 50) {
            creep.memory.invaderCooldown = undefined;
        }
    }

    if (creep.pos.roomName !== creep.memory.destination) {
        creep.memory.destinationReached = false;
    }
    if (creep.carry.energy === 0) {
        creep.memory.hauling = false;
    }
    if (creep.carry.energy === creep.carryCapacity) {
        creep.memory.hauling = true;
    }

    if (creep.memory.destinationReached === true || creep.memory.hauling === true) {
        if (creep.memory.hauling === false) {
            if (!creep.memory.containerID) {
                let container = creep.room.find(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_CONTAINER && _.sum(s.store) > s.storeCapacity / 2 && _.filter(Game.creeps, (c) => c.memory.containerID === s.id).length === 0});
                if (container.length > 0) {
                    creep.memory.containerID = container[0].id;
                    for (const resourceType in container.store) {
                        if (creep.withdraw(container, resourceType) === ERR_NOT_IN_RANGE) {
                            creep.shibMove(container);
                        }
                    }
                }
            } else {
                if (_.sum(Game.getObjectById(creep.memory.containerID).store) === 0) {
                    creep.memory.containerID = undefined;
                }
                if (creep.withdraw(Game.getObjectById(creep.memory.containerID), RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.shibMove(Game.getObjectById(creep.memory.containerID), {offRoad: true});
                }
            }
        } else {
            if (creep.pos.getRangeTo(Game.getObjectById(creep.memory.assignedSpawn)) <= 50 && creep.pos.roomName !== creep.memory.destination) {
                creep.memory.destinationReached = false;
                let terminal = _.pluck(_.filter(creep.room.memory.structureCache, 'type', 'terminal'), 'id');
                let storage = _.pluck(_.filter(creep.room.memory.structureCache, 'type', 'storage'), 'id');
                if (storage.length > 0) {
                    creep.memory.storageDestination = storage[0];
                } else if (terminal.length > 0) {
                    creep.memory.storageDestination = terminal[0];
                }
                if (creep.memory.storageDestination) {
                    let storageItem = Game.getObjectById(creep.memory.storageDestination);
                    for (const resourceType in creep.carry) {
                        if (creep.transfer(storageItem, resourceType) === ERR_NOT_IN_RANGE) {
                            creep.shibMove(storageItem);
                        } else {
                            creep.memory.storageDestination = null;
                            creep.memory.path = null;
                        }
                        return null;
                    }
                }
                creep.findStorage();
            } else {
                creep.shibMove(Game.getObjectById(creep.memory.assignedSpawn), {
                    range: 5
                });
            }
        }
    } else if (!creep.memory.destinationReached) {
        if (!Game.flags[creep.memory.destination]) {
            creep.memory.containerID = undefined;
            if (creep.pos.getRangeTo(new RoomPosition(25, 25, creep.memory.destination)) <= 10) {
                creep.memory.destinationReached = true;
            }
            creep.shibMove(new RoomPosition(25, 25, creep.memory.destination), {range: 7, offRoad: true});
        } else {
            creep.memory.containerID = undefined;
            if (creep.pos.getRangeTo(Game.flags[creep.memory.destination]) <= 10) {
                creep.memory.destinationReached = true;
            }
            creep.shibMove(Game.flags[creep.memory.destination], {range: 7, offRoad: true});
        }
    }
}
hauler = profiler.registerFN(hauler, 'haulerRemote');

/**
 * @return {null}
 */
function pioneer(creep) {
    //Invader detection
    invaderCheck(creep);
    if (creep.memory.invaderDetected === true || creep.memory.invaderCooldown < 50) {
        creep.memory.invaderCooldown++;
        creep.shibMove(Game.getObjectById(creep.memory.assignedSpawn));
        creep.memory.destinationReached = false;
        return null;
    } else if (creep.memory.invaderCooldown > 50) {
        creep.memory.invaderCooldown = undefined;
    }

    if (creep.carry.energy === 0) {
        creep.memory.hauling = false;
    }
    if (creep.carry.energy === creep.carryCapacity) {
        creep.memory.hauling = true;
    }
    if (creep.memory.hauling === false) {
        if (creep.room.name === Game.spawns[Game.getObjectById(creep.memory.assignedSpawn).name].pos.roomName) {
            if (creep.memory.energyDestination) {
                creep.withdrawEnergy();
                return null;
            } else {
                creep.findEnergy();
                return null;
            }
        } else {
            let container = creep.room.find(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] > 100});
            if (container.length > 0) {
                if (creep.withdraw(container[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.shibMove(container[0]);
                }
            } else if (creep.memory.source) {
                if (creep.harvest(Game.getObjectById(creep.memory.source)) === ERR_NOT_IN_RANGE) {
                    creep.shibMove(Game.getObjectById(creep.memory.source));
                }
            } else if (!creep.memory.source) {
                creep.findSource();
            }
        }
    } else
    if (!creep.memory.destinationReached && creep.memory.hauling === true) {
        creep.shibMove(Game.flags[creep.memory.destination]);
        if (creep.pos.getRangeTo(Game.flags[creep.memory.destination]) <= 1) {
            creep.memory.destinationReached = true;
        }
    } else if (creep.memory.destinationReached && creep.memory.hauling === true) {
        creep.findConstruction();
        if (creep.memory.task === 'build' && creep.room.memory.responseNeeded !== true) {
            let construction = Game.getObjectById(creep.memory.constructionSite);
            if (creep.build(construction) === ERR_NOT_IN_RANGE) {
                creep.shibMove(construction);
            }
        } else {
            creep.findRepair('1');
            if (creep.memory.task === 'repair' && creep.memory.constructionSite) {
                let repairNeeded = Game.getObjectById(creep.memory.constructionSite);
                if (creep.repair(repairNeeded) === ERR_NOT_IN_RANGE) {
                    creep.shibMove(repairNeeded);
                }
            } else if (creep.upgradeController(Game.rooms[creep.memory.assignedRoom].controller) === ERR_NOT_IN_RANGE) {
                creep.shibMove(Game.rooms[creep.memory.assignedRoom].controller);
            }
        }
    }
}
pioneer = profiler.registerFN(pioneer, 'pioneerRemote');

function depositEnergy(creep) {
    if (!creep.memory.containerID) {
        creep.memory.containerID = creep.harvestDepositContainer();
    }
    if (creep.memory.containerID) {
        let container = Game.getObjectById(creep.memory.containerID);
        if (container) {
            if (container.hits < container.hitsMax * 0.25) {
                if (creep.repair(container) === ERR_NOT_IN_RANGE) {
                    creep.shibMove(container);
                } else {
                    creep.say('Fixing');
                }
            } else if (container.store[RESOURCE_ENERGY] !== container.storeCapacity) {
                creep.transfer(container, RESOURCE_ENERGY);
            }
        }
    } else {
        let buildSite = Game.getObjectById(creep.containerBuilding());
        if (buildSite) {
            creep.build(buildSite);
        } else {
            creep.harvesterContainerBuild();
        }
    }
}

function invaderCheck(creep) {
    let invader = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {filter: (c) => (c.getActiveBodyparts(ATTACK) >= 1 || c.getActiveBodyparts(RANGED_ATTACK) >= 1 || c.getActiveBodyparts(WORK) >= 1) && _.includes(RawMemory.segments[2], c.owner['username']) === false});
    if (invader) {
        creep.room.memory.responseNeeded = true;
        if (!creep.memory.invaderCooldown) {
            creep.memory.invaderCooldown = 1;
        }
        creep.room.memory.tickDetected = Game.time;
        creep.memory.invaderDetected = true;
    } else if (creep.room.memory.tickDetected < Game.time - 150 || creep.room.memory.responseNeeded === false) {
        creep.memory.invaderDetected = undefined;
        creep.memory.invaderID = undefined;
        creep.room.memory.numberOfHostiles = undefined;
        creep.room.memory.responseNeeded = false;
    }
}
invaderCheck = profiler.registerFN(invaderCheck, 'invaderCheckRemote');