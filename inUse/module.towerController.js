/**
 * Created by rober on 5/16/2017.
 */

module.exports.towerControl = function () {
    for (let tower of _.values(Game.structures)) {
        if (tower.structureType === STRUCTURE_TOWER) {
            const ramp = tower.pos.findClosestByRange(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_RAMPART && s.hits < 500});
            const wall = tower.pos.findClosestByRange(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_WALL && s.hits < 500});
            const woundedCreep = Game.getObjectById(findWounded(tower));
            const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            if (ramp) {
                tower.repair(ramp);
            } else if (wall) {
                tower.repair(wall);
            } else
            //Check if hostiles are in room
            if (closestHostile) {
                tower.attack(closestHostile);
            } else if (woundedCreep) {
                tower.heal(woundedCreep);
            } else if (tower.energy > tower.energyCapacity * 0.75) {
                const closestDamagedStructure = Game.getObjectById(findRepair(tower));
                if (closestDamagedStructure) {
                    tower.repair(closestDamagedStructure);
                }
            }
        }
    }
};

function findRepair(tower) {

    site = tower.pos.findClosestByRange(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_SPAWN && s.hits < s.hitsMax});
    if (site === null) {
        site = tower.pos.findClosestByRange(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_RAMPART && s.hits < 1000});
    }
    if (site === null) {
        site = tower.pos.findClosestByRange(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_EXTENSION && s.hits < s.hitsMax});
    }
    if (site === null) {
        site = tower.pos.findClosestByRange(FIND_STRUCTURES, {filter: (s) => s.structureType !== STRUCTURE_WALL && s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_CONTAINER && s.structureType !== STRUCTURE_RAMPART && s.hits < s.hitsMax});
    }
    if (site === null) {
        site = tower.pos.findClosestByRange(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_CONTAINER && s.hits < 1000});
    }
    if (site === null) {
        site = tower.pos.findClosestByRange(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_ROAD && s.hits < s.hitsMax / 2});
    }
    if (site === null) {
        site = tower.pos.findClosestByRange(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_RAMPART && s.hits < 100000});
    }
    if (site === null) {
        site = tower.pos.findClosestByRange(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_WALL && s.hits < 100000});
    }
    if (site !== null && site !== undefined) {
        return site.id;
    }
}

function findWounded(tower) {

    const creep = tower.pos.findClosestByRange(FIND_CREEPS, {filter: (s) => s.hits < s.hitsMax});
    if (creep !== null && creep !== undefined) {
        return creep.id;
    }
}