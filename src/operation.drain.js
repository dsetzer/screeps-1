Creep.prototype.drainRoom = function () {
    let sentence = ['Gimme', 'That', 'Energy', 'Please'];
    let word = Game.time % sentence.length;
    this.say($2, false);
    this.heal(this);
    this.borderHump();
};