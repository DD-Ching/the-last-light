/*
 * CollectibleKey.js — One of the 3 keys needed to unlock the exit.
 *
 * A key gently bobs and glows so it's findable in the dark. When the player
 * overlaps it, the scene calls collect().
 */

class CollectibleKey extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'key');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body).setAllowGravity?.(false);
    this.collected = false;
    this.setDepth(40);

    // A soft halo behind the key so it reads in darkness.
    this.halo = scene.add.image(x, y, 'keyHalo').setDepth(39).setAlpha(0.5);

    // Bob up and down.
    scene.tweens.add({
      targets: [this, this.halo],
      y: y - 8,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    // Pulse the halo.
    scene.tweens.add({
      targets: this.halo,
      alpha: 0.18,
      scale: 1.25,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  collect() {
    if (this.collected) return;
    this.collected = true;
    this.scene.tweens.add({
      targets: [this, this.halo],
      scale: 0,
      alpha: 0,
      duration: 220,
      onComplete: () => { this.halo.destroy(); this.destroy(); },
    });
  }
}
