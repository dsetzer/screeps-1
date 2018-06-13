/**
 * Created by Bob on 7/12/2017.
 */

let _ = require('lodash');
const profiler = require('screeps-profiler');

function role(creep) {
    creep.say(ICONS.haul, false);
    if (creep.getActiveBodyparts(WORK) > 0) if (creep.renewalCheck(7)) return null;
    if (creep.room.invaderCheck() || creep.hits < creep.hitsMax) return creep.goHomeAndHeal();
    creep.repairRoad();
    if (_.sum(creep.carry) === 0) {
        creep.memory.storageDestination = undefined;
        creep.memory.hauling = false;
    }
    if (_.sum(creep.carry) >= creep.carryCapacity * 0.5) {
        creep.memory.hauling = true;
        creep.memory.destination = undefined;
        creep.memory.containerID = undefined;
    }
    if (!creep.memory.destination && !creep.memory.hauling && !creep.memory.destinationReached) {
        if (!Game.rooms[creep.memory.overlord].memory.remoteRooms) return creep.suicide();
        let overlord = Game.rooms[creep.memory.overlord];
        let requesting = overlord.memory.remotesNeedingHauler;
        if (!requesting.length) return creep.idleFor(15);
        creep.memory.destination = requesting[0];
        overlord.memory.remotesNeedingHauler = _.filter(requesting, (r) => r !== creep.memory.destination);
    }
    if (creep.pos.roomName === creep.memory.destination) {
        creep.memory.destinationReached = true;
        creep.memory.destination = undefined;
    }
    if (creep.memory.destinationReached === true || creep.memory.hauling === true) {
        if (creep.memory.hauling === false) {
            if (!creep.memory.containerID) {
                let container = _.filter(creep.room.structures, (s) => s.structureType === STRUCTURE_CONTAINER && _.sum(s.store) >= 100);
                if (container.length > 0) {
                    creep.memory.containerID = _.sample(container).id;
                } else if (creep.room.find(FIND_DROPPED_RESOURCES, {filter: (s) => s.amount > 50}).length > 0) {
                    let dropped = creep.room.find(FIND_DROPPED_RESOURCES, {filter: (s) => s.amount > 50})[0];
                    for (const resourceType in dropped) {
                        if (creep.pickup(dropped, resourceType) === ERR_NOT_IN_RANGE) {
                            creep.shibMove(dropped);
                        }
                    }
                } else if (creep.memory.destination) {
                    creep.shibMove(new RoomPosition(25, 25, creep.memory.destination), {range: 20, offRoad: true});
                }
            } else {
                if (!Game.getObjectById(creep.memory.containerID) || _.sum(Game.getObjectById(creep.memory.containerID).store) === 0) {
                    return delete creep.memory.containerID;
                }
                let container = Game.getObjectById(creep.memory.containerID);
                for (const resourceType in container.store) {
                    if (creep.withdraw(container, resourceType) === ERR_NOT_IN_RANGE) {
                        creep.shibMove(container);
                    }
                }
            }
        } else {
            if (creep.pos.roomName === creep.memory.overlord) {
                creep.memory.destinationReached = false;
                if (creep.memory.storageDestination) {
                    let storageItem = Game.getObjectById(creep.memory.storageDestination);
                    for (const resourceType in creep.carry) {
                        switch (creep.transfer(storageItem, resourceType)) {
                            case OK:
                                break;
                            case ERR_NOT_IN_RANGE:
                                creep.shibMove(storageItem);
                                break;
                            case ERR_FULL:
                                creep.memory.storageDestination = undefined;
                                break;
                        }
                    }
                } else {
                    let labs = _.filter(creep.room.structures, (s) => s.structureType === STRUCTURE_LAB && s.energy < s.energyCapacity * 0.75);
                    let storage = creep.room.storage;
                    let terminal = creep.room.terminal;
                    let link = Game.getObjectById(creep.room.memory.controllerLink);
                    let nuker = _.filter(creep.room.structures, (s) => s.structureType === STRUCTURE_NUKER && s.energy < s.energyCapacity)[0];
                    let controllerContainer = Game.getObjectById(creep.room.memory.controllerContainer);
                    if (labs[0] && creep.carry[RESOURCE_ENERGY] === _.sum(creep.carry)) {
                        creep.memory.storageDestination = labs[0].id;
                    } else if (nuker && creep.carry[RESOURCE_ENERGY] === _.sum(creep.carry)) {
                        creep.memory.storageDestination = nuker.id;
                    } else if (terminal && _.sum(terminal.store) < terminal.storeCapacity * 0.90 && (storage.store[RESOURCE_ENERGY] > ENERGY_AMOUNT * 3 ||
                        terminal.store[RESOURCE_ENERGY] <= 5000 || _.sum(storage.store) >= storage.storeCapacity * 0.90)) {
                        creep.memory.storageDestination = terminal.id;
                    } else if (!link && controllerContainer && creep.carry[RESOURCE_ENERGY] === _.sum(creep.carry) && _.sum(controllerContainer.store) < controllerContainer.storeCapacity * 0.75) {
                        creep.memory.storageDestination = controllerContainer.id;
                    } else if (storage && storage.store[RESOURCE_ENERGY] < ENERGY_AMOUNT * 3.5) {
                        creep.memory.storageDestination = storage.id;
                    } else if (link && controllerContainer && creep.carry[RESOURCE_ENERGY] === _.sum(creep.carry) && _.sum(controllerContainer.store) < controllerContainer.storeCapacity * 0.25) {
                        creep.memory.storageDestination = controllerContainer.id;
                    } else if (storage) {
                        creep.memory.storageDestination = storage.id;
                    } else {
                        creep.findEssentials()
                    }
                }
            } else {
                creep.shibMove(new RoomPosition(25, 25, creep.memory.overlord), {range: 23, ignoreRoads: true});
            }
        }
    } else if (creep.memory.destination && !creep.memory.destinationReached) {
        delete creep.memory.containerID;
        if (creep.pos.roomName === creep.memory.destination) creep.memory.destinationReached = true;
        creep.shibMove(new RoomPosition(25, 25, creep.memory.destination), {range: 20, offRoad: true});
    } else {
        creep.shibMove(new RoomPosition(25, 25, creep.memory.overlord), {range: 18, offRoad: true});
    }
}

module.exports.role = profiler.registerFN(role, 'remoteHaulerRole');
