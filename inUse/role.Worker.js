/**
 * Created by Bob on 7/12/2017.
 */

let _ = require('lodash');
const profiler = require('screeps-profiler');


/**
 * @return {null}
 */
function role(creep) {
    if (creep.renewalCheck()) return creep.shibMove(creep.pos.findClosestByRange(FIND_MY_SPAWNS));
    //INITIAL CHECKS
    if (creep.borderCheck()) return null;
    if (creep.wrongRoom()) return null;
    if (creep.carry.energy === 0) {
        creep.memory.working = null;
    }
    if (creep.carry.energy >= creep.carryCapacity * 0.75) {
        creep.memory.working = true;
    }
    if (creep.memory.working === true) {
        let newRamps = creep.pos.findInRange(FIND_MY_STRUCTURES, 3, {filter: (s) => s.structureType === STRUCTURE_RAMPART && s.hits < 500000});
        if (newRamps.length > 0) {
            creep.repair(newRamps[0]);
        } else {
            creep.findConstruction();
            if (creep.memory.task === 'build' && creep.room.memory.responseNeeded !== true) {
                let construction = Game.getObjectById(creep.memory.constructionSite);
                if (creep.build(construction) === ERR_NOT_IN_RANGE) {
                    creep.shibMove(construction, {range: 3});
                }
            } else {
                creep.findRepair(creep.room.controller.level);
                if (creep.memory.task === 'repair' && creep.memory.constructionSite) {
                    let repairNeeded = Game.getObjectById(creep.memory.constructionSite);
                    if (creep.repair(repairNeeded) === ERR_NOT_IN_RANGE) {
                        creep.shibMove(repairNeeded, {range: 3});
                    }
                } else if (creep.upgradeController(Game.rooms[creep.memory.assignedRoom].controller) === ERR_NOT_IN_RANGE) {
                    creep.shibMove(Game.rooms[creep.memory.assignedRoom].controller);
                }
            }
        }
    }
    else {
        if (creep.memory.energyDestination) {
            creep.withdrawEnergy();
        } else {
            let storage = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_STORAGE && s.store[RESOURCE_ENERGY] > 0});
            if (storage) {
                if (creep.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.shibMove(storage);
                }
            } else {
                creep.findEnergy();
            }
            if (!creep.memory.energyDestination && creep.room.controller.level <= 2) {
                let source = creep.pos.findClosestByRange(FIND_SOURCES);
                if (creep.harvest(source) === ERR_NOT_IN_RANGE) creep.shibMove(source)
            }
        }
    }
}
module.exports.role = profiler.registerFN(role, 'workerRole');